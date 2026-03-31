import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  // Blood Group Report
  async getBloodGroupReport() {
    const profiles = await this.prisma.profile.findMany({
      where: { bloodGroup: { not: null } },
      select: { bloodGroup: true, firstName: true, lastName: true, contactNo: true, user: { select: { username: true, displayName: true, team: { select: { teamName: true } } } } },
      orderBy: { bloodGroup: 'asc' },
    });

    // Group by blood group
    const groups: Record<string, any[]> = {};
    for (const p of profiles) {
      const bg = p.bloodGroup || 'Unknown';
      if (!groups[bg]) groups[bg] = [];
      groups[bg].push({
        name: p.user?.displayName || `${p.firstName} ${p.lastName}`.trim() || p.user?.username,
        team: p.user?.team?.teamName || '-',
        contact: p.contactNo || '-',
      });
    }
    return groups;
  }

  findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search } },
        { contactNo: { contains: search } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.profile.findMany({
      where,
      include: { user: { select: { username: true, displayName: true, teamId: true, team: { select: { teamName: true } }, isActive: true } } },
      orderBy: { firstName: 'asc' },
    });
  }

  async findByUserId(userId: number) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { education: true, experience: true, visas: true, user: { select: { username: true, displayName: true, email: true, teamId: true } } },
    });

    // Auto-create profile if it doesn't exist
    if (!profile) {
      profile = await this.prisma.profile.create({
        data: { userId },
        include: { education: true, experience: true, visas: true, user: { select: { username: true, displayName: true, email: true, teamId: true } } },
      });
    }

    // Calculate tenure (from date_of_joining)
    let tenureYears = 0, tenureMonths = 0;
    if (profile.dateOfJoining) {
      const now = new Date();
      const doj = new Date(profile.dateOfJoining);
      const diffMs = now.getTime() - doj.getTime();
      const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      tenureYears = Math.floor(totalMonths / 12);
      tenureMonths = totalMonths % 12;
    }

    // Calculate total experience from profile_experience
    let totalExpYears = 0, totalExpMonths = 0;
    for (const exp of (profile.experience || [])) {
      if (exp.workFrom) {
        const from = new Date(exp.workFrom);
        const to = exp.workTo ? new Date(exp.workTo) : new Date();
        const months = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        totalExpMonths += months;
      }
    }
    // Add current company tenure
    if (profile.dateOfJoining) {
      totalExpMonths += tenureYears * 12 + tenureMonths;
    }
    totalExpYears = Math.floor(totalExpMonths / 12);
    totalExpMonths = totalExpMonths % 12;

    // Calculate completion percentage
    const fields = [
      profile.firstName, profile.lastName, profile.cnic, profile.contactNo,
      profile.personalEmail, profile.dob, profile.maritalStatus, profile.bloodGroup,
      profile.fatherName, profile.nationality, profile.currentAddress, profile.permanentAddress,
      profile.dateOfJoining, profile.jobTitle,
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && f !== '').length;
    const hasEducation = (profile.education || []).length > 0 ? 1 : 0;
    const hasExperience = (profile.experience || []).length > 0 ? 1 : 0;
    const totalFields = fields.length + 2; // +2 for education & experience sections
    const completionPct = Math.round(((filled + hasEducation + hasExperience) / totalFields) * 100);

    return { ...profile, completionPct, tenureYears, tenureMonths, totalExpYears, totalExpMonths };
  }

  async upsert(userId: number, data: any) {
    try {
    const { education, experience, visas, ...profileData } = data;

    // Convert date strings to Date objects for Prisma
    if (profileData.dob) profileData.dob = new Date(profileData.dob);
    else if (profileData.dob === null || profileData.dob === '') delete profileData.dob;
    if (profileData.dateOfJoining) profileData.dateOfJoining = new Date(profileData.dateOfJoining);
    else if (profileData.dateOfJoining === null || profileData.dateOfJoining === '') delete profileData.dateOfJoining;
    if (profileData.passportExpiry) profileData.passportExpiry = new Date(profileData.passportExpiry);
    else if (profileData.passportExpiry === null || profileData.passportExpiry === '') delete profileData.passportExpiry;

    // Remove any undefined fields
    for (const key of Object.keys(profileData)) {
      if (profileData[key] === undefined) delete profileData[key];
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: profileData,
      create: { userId, ...profileData },
    });

    // Replace education records
    if (education) {
      await this.prisma.profileEducation.deleteMany({ where: { profileId: profile.id } });
      if (education.length) {
        await this.prisma.profileEducation.createMany({
          data: education.map((e: any) => ({
            profileId: profile.id,
            recordType: e.recordType || 'education',
            examination: e.examination || null,
            degree: e.degree || null,
            board: e.board || null,
            passingYear: e.passingYear || null,
            percentage: e.percentage || null,
          })),
        });
      }
    }

    // Replace experience records
    if (experience) {
      await this.prisma.profileExperience.deleteMany({ where: { profileId: profile.id } });
      if (experience.length) {
        await this.prisma.profileExperience.createMany({
          data: experience.map((e: any) => ({
            profileId: profile.id,
            organization: e.organization || null,
            designation: e.designation || null,
            jobRole: e.jobRole || null,
            workFrom: e.workFrom ? new Date(e.workFrom) : null,
            workTo: e.workTo ? new Date(e.workTo) : null,
          })),
        });
      }
    }

    // Replace visa records
    if (visas) {
      await this.prisma.profileVisa.deleteMany({ where: { profileId: profile.id } });
      if (visas.length) {
        await this.prisma.profileVisa.createMany({
          data: visas.map((v: any) => ({
            profileId: profile.id,
            visaCountry: v.visaCountry || null,
            visaExpiry: v.visaExpiry ? new Date(v.visaExpiry) : null,
          })),
        });
      }
    }

    return this.findByUserId(userId);
    } catch (e: any) {
      console.error('Profile upsert error:', e.message);
      throw e;
    }
  }
}
