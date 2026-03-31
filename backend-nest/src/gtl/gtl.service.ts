import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GtlService {
  constructor(private prisma: PrismaService) {}

  // --- Time Entries ---
  async findTimeEntries(filters: { userId?: number; from?: string; to?: string; status?: number; teamId?: number; page?: number; pageSize?: number }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status !== undefined) where.status = filters.status;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.from || filters.to) {
      where.entryDate = {};
      if (filters.from) where.entryDate.gte = new Date(filters.from);
      if (filters.to) where.entryDate.lte = new Date(filters.to);
    }
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;

    const [items, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          program: true, project: true, subProject: true, wbs: true,
          team: { select: { id: true, teamName: true } },
          approver: { select: { username: true, displayName: true } },
        },
        orderBy: { entryDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  createTimeEntry(data: any) {
    return this.prisma.timeEntry.create({
      data: {
        userId: data.userId, programId: data.programId, teamId: data.teamId,
        projectId: data.projectId, subProjectId: data.subProjectId,
        workType: data.workType, productPhase: data.productPhase,
        entryDate: new Date(data.entryDate), description: data.description,
        wbsId: data.wbsId, hours: data.hours, approverId: data.approverId, status: 0,
      },
    });
  }

  updateTimeEntry(id: number, data: any) {
    const updateData: any = {};
    if (data.programId !== undefined) updateData.programId = data.programId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.subProjectId !== undefined) updateData.subProjectId = data.subProjectId;
    if (data.workType !== undefined) updateData.workType = data.workType;
    if (data.productPhase !== undefined) updateData.productPhase = data.productPhase;
    if (data.entryDate !== undefined) updateData.entryDate = new Date(data.entryDate);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.wbsId !== undefined) updateData.wbsId = data.wbsId;
    if (data.hours !== undefined) updateData.hours = data.hours;
    return this.prisma.timeEntry.update({ where: { id }, data: updateData });
  }

  deleteTimeEntry(id: number) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  approveEntry(id: number, approverId: number) {
    return this.prisma.timeEntry.update({ where: { id }, data: { status: 1, approverId } });
  }

  rejectEntry(id: number, approverId: number) {
    return this.prisma.timeEntry.update({ where: { id }, data: { status: 2, approverId } });
  }

  // Batch approve all pending entries for a user
  async batchApprove(userId: number, approverId: number) {
    const result = await this.prisma.timeEntry.updateMany({
      where: { userId, status: 0 },
      data: { status: 1, approverId },
    });
    return { updated: result.count };
  }

  // Get timesheet grouped by week for a user/year/month
  async getTimesheetGrouped(userId: number, year: number, month: number, programId?: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // last day of month

    const where: any = { userId, entryDate: { gte: from, lte: to } };
    if (programId) where.programId = programId;

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        program: { select: { id: true, programName: true } },
        project: { select: { id: true, projectName: true } },
        subProject: { select: { id: true, subProjectName: true } },
        wbs: { select: { id: true, description: true } },
        approver: { select: { username: true, displayName: true } },
      },
      orderBy: { entryDate: 'asc' },
    });

    // Get the ISO week of the first day of the month to calculate week numbers
    const weeks: any[] = [];
    const weekMap = new Map<string, any>();

    // Calculate week boundaries starting from Monday
    const firstDay = new Date(year, month - 1, 1);
    // Find the Monday of the week containing the 1st
    const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let weekStart = new Date(year, month - 1, 1 + mondayOffset);

    while (weekStart <= to) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Clamp to month boundaries for display
      const displayStart = weekStart < from ? from : weekStart;
      const displayEnd = weekEnd > to ? to : weekEnd;

      // Get ISO week number
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      const weekNum = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000) + 1) / 7);

      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, {
        weekNumber: weekNum,
        weekStart: weekStart.toISOString().slice(0, 10),
        weekEnd: weekEnd.toISOString().slice(0, 10),
        displayStart: displayStart.toISOString().slice(0, 10),
        displayEnd: displayEnd.toISOString().slice(0, 10),
        entries: [],
        totalHours: 0,
      });

      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Assign entries to weeks
    for (const entry of entries) {
      const entryDate = new Date(entry.entryDate);
      for (const [, week] of weekMap) {
        const ws = new Date(week.weekStart);
        const we = new Date(week.weekEnd);
        if (entryDate >= ws && entryDate <= we) {
          week.entries.push(entry);
          week.totalHours += Number(entry.hours);
          break;
        }
      }
    }

    // Filter out empty weeks and sort
    const result = Array.from(weekMap.values())
      .filter(w => w.entries.length > 0)
      .map(w => ({ ...w, totalHours: Math.round(w.totalHours * 10) / 10 }));

    const grandTotal = Math.round(entries.reduce((s, e) => s + Number(e.hours), 0) * 10) / 10;

    // Get distinct programs that have entries this month for the filter
    const programsUsed = await this.prisma.timeEntry.findMany({
      where: { userId, entryDate: { gte: from, lte: to } },
      select: { programId: true, program: { select: { id: true, programName: true } } },
      distinct: ['programId'],
    });

    return { year, month, weeks: result, grandTotal, totalEntries: entries.length, programs: programsUsed.map(p => p.program) };
  }

  // Get users with pending entries (for approval page dropdown)
  async getUsersWithPendingEntries() {
    const users = await this.prisma.timeEntry.findMany({
      where: { status: 0 },
      select: { userId: true, user: { select: { id: true, username: true, displayName: true } } },
      distinct: ['userId'],
      orderBy: { userId: 'asc' },
    });
    return users.map(u => u.user);
  }

  // Get pending entries for a specific user, grouped by week
  async getPendingEntriesGrouped(userId: number) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { userId, status: 0 },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        program: { select: { programName: true } },
        project: { select: { projectName: true } },
        subProject: { select: { subProjectName: true } },
        wbs: { select: { description: true } },
      },
      orderBy: { entryDate: 'asc' },
    });

    if (entries.length === 0) return { weeks: [], grandTotal: 0 };

    // Group by week
    const weekMap = new Map<string, any>();
    for (const entry of entries) {
      const entryDate = new Date(entry.entryDate);
      // Find Monday of this entry's week
      const day = entryDate.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(entryDate);
      monday.setDate(monday.getDate() + mondayOffset);
      const key = monday.toISOString().slice(0, 10);

      if (!weekMap.has(key)) {
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        // ISO week number
        const d = new Date(monday);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const weekNum = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 86400000) + 1) / 7);

        weekMap.set(key, {
          weekNumber: weekNum,
          weekStart: key,
          weekEnd: sunday.toISOString().slice(0, 10),
          entries: [],
          totalHours: 0,
        });
      }
      const week = weekMap.get(key)!;
      week.entries.push(entry);
      week.totalHours += Number(entry.hours);
    }

    const weeks = Array.from(weekMap.values())
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .map(w => ({ ...w, totalHours: Math.round(w.totalHours * 10) / 10 }));

    const grandTotal = Math.round(entries.reduce((s, e) => s + Number(e.hours), 0) * 10) / 10;
    return { weeks, grandTotal };
  }

  // Download timesheet as CSV data
  async getTimesheetCsv(userId: number, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);

    const entries = await this.prisma.timeEntry.findMany({
      where: { userId, entryDate: { gte: from, lte: to } },
      include: {
        user: { select: { username: true, displayName: true } },
        program: { select: { programName: true } },
        project: { select: { projectName: true } },
        subProject: { select: { subProjectName: true } },
        wbs: { select: { description: true } },
      },
      orderBy: { entryDate: 'asc' },
    });

    const header = 'Sr.No,Username,Date,Program,Project,Sub Project,WBS,Description,Hours,Status';
    const rows = entries.map((e, i) => {
      const status = e.status === 1 ? 'Approved' : e.status === 0 ? 'Pending' : 'Rejected';
      const desc = (e.description || '').replace(/"/g, '""');
      return `${i + 1},"${e.user.username}","${new Date(e.entryDate).toISOString().slice(0, 10)}","${e.program?.programName || ''}","${e.project?.projectName || ''}","${e.subProject?.subProjectName || ''}","${e.wbs?.description || ''}","${desc}",${e.hours},${status}`;
    });

    return header + '\n' + rows.join('\n');
  }

  // --- Resource Allocation (Resource wise) ---
  async getResourceAllocation(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const daysInMonth = to.getDate();

    const entries = await this.prisma.timeEntry.findMany({
      where: { entryDate: { gte: from, lte: to } },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        project: { select: { projectName: true } },
        team: { select: { teamName: true } },
      },
      orderBy: [{ userId: 'asc' }, { entryDate: 'asc' }],
    });

    // Group by user
    const userMap = new Map<number, any>();
    for (const e of entries) {
      if (!userMap.has(e.userId)) {
        userMap.set(e.userId, {
          user: e.user,
          totalHours: 0,
          projects: new Map<string, any>(),
          dailyHours: Array(daysInMonth).fill(0),
        });
      }
      const u = userMap.get(e.userId)!;
      const day = new Date(e.entryDate).getDate() - 1;
      const hours = Number(e.hours);
      u.totalHours += hours;
      u.dailyHours[day] += hours;

      const projName = e.project?.projectName || 'No Project';
      if (!u.projects.has(projName)) {
        u.projects.set(projName, { projectName: projName, team: e.team?.teamName, dailyHours: Array(daysInMonth).fill(0), total: 0 });
      }
      const p = u.projects.get(projName)!;
      p.dailyHours[day] += hours;
      p.total += hours;
    }

    // Working days (approx 22 per month * 8h = 176h)
    const expectedHours = 160;
    const result = Array.from(userMap.values()).map((u) => ({
      ...u.user,
      totalHours: Math.round(u.totalHours * 10) / 10,
      percentage: Math.round((u.totalHours / expectedHours) * 100),
      dailyHours: u.dailyHours.map((h: number) => Math.round(h * 10) / 10),
      projects: Array.from(u.projects.values()),
    }));

    return { year, month, daysInMonth, expectedHours, users: result.sort((a, b) => a.displayName?.localeCompare(b.displayName || '') || 0) };
  }

  // --- Resource Allocation (Project wise) ---
  async getProjectAllocation(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const daysInMonth = to.getDate();

    const entries = await this.prisma.timeEntry.findMany({
      where: { entryDate: { gte: from, lte: to } },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        project: { select: { id: true, projectName: true } },
      },
      orderBy: [{ projectId: 'asc' }, { userId: 'asc' }, { entryDate: 'asc' }],
    });

    const projectMap = new Map<string, any>();
    for (const e of entries) {
      const projName = e.project?.projectName || 'No Project';
      if (!projectMap.has(projName)) {
        projectMap.set(projName, { projectName: projName, totalHours: 0, users: new Map() });
      }
      const proj = projectMap.get(projName)!;
      const hours = Number(e.hours);
      proj.totalHours += hours;

      const userName = e.user?.displayName || e.user?.username || 'Unknown';
      if (!proj.users.has(userName)) {
        proj.users.set(userName, { name: userName, dailyHours: Array(daysInMonth).fill(0), total: 0 });
      }
      const u = proj.users.get(userName)!;
      const day = new Date(e.entryDate).getDate() - 1;
      u.dailyHours[day] += hours;
      u.total += hours;
    }

    const result = Array.from(projectMap.values()).map((p) => ({
      projectName: p.projectName,
      totalHours: Math.round(p.totalHours * 10) / 10,
      users: Array.from(p.users.values()).map((u: any) => ({
        ...u, total: Math.round(u.total * 10) / 10,
        dailyHours: u.dailyHours.map((h: number) => Math.round(h * 10) / 10),
      })),
    }));

    return { year, month, daysInMonth, projects: result };
  }

  // --- Team Report ---
  async getTeamReport(from: string, to: string, teamId?: number) {
    const where: any = { entryDate: { gte: new Date(from), lte: new Date(to) } };
    if (teamId) where.teamId = teamId;

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        team: { select: { teamName: true } },
      },
    });

    const userMap = new Map<number, any>();
    for (const e of entries) {
      if (!userMap.has(e.userId)) {
        userMap.set(e.userId, { ...e.user, teamName: e.team?.teamName, totalHours: 0 });
      }
      userMap.get(e.userId)!.totalHours += Number(e.hours);
    }

    return Array.from(userMap.values())
      .map((u) => ({ ...u, totalHours: Math.round(u.totalHours * 10) / 10 }))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  // --- General Report ---
  async getGeneralReport(filters: any) {
    const where: any = {};
    if (filters.programId) where.programId = filters.programId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.subProjectId) where.subProjectId = filters.subProjectId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status !== undefined) where.status = filters.status;
    if (filters.from || filters.to) {
      where.entryDate = {};
      if (filters.from) where.entryDate.gte = new Date(filters.from);
      if (filters.to) where.entryDate.lte = new Date(filters.to);
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { username: true, displayName: true } },
        program: { select: { programName: true } },
        project: { select: { projectName: true } },
        subProject: { select: { subProjectName: true } },
        wbs: { select: { description: true } },
      },
      orderBy: { entryDate: 'desc' },
      take: 1000,
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const approvedHours = entries.filter((e) => e.status === 1).reduce((sum, e) => sum + Number(e.hours), 0);
    const unapprovedHours = entries.filter((e) => e.status === 0).reduce((sum, e) => sum + Number(e.hours), 0);

    return { entries, totalHours: Math.round(totalHours * 10) / 10, approvedHours: Math.round(approvedHours * 10) / 10, unapprovedHours: Math.round(unapprovedHours * 10) / 10 };
  }

  // --- Programs CRUD ---
  findAllPrograms() { return this.prisma.program.findMany({ orderBy: { programName: 'asc' } }); }
  findPrograms() { return this.prisma.program.findMany({ where: { isActive: true }, orderBy: { programName: 'asc' } }); }
  createProgram(data: any) { return this.prisma.program.create({ data: { programName: data.programName, legacyProgramId: data.legacyProgramId, isActive: data.isActive ?? true } }); }
  updateProgram(id: number, data: any) { return this.prisma.program.update({ where: { id }, data }); }

  // --- Projects CRUD ---
  findAllProjects() { return this.prisma.project.findMany({ include: { program: true }, orderBy: { projectName: 'asc' } }); }
  findProjects(programId?: number) {
    const where: any = { isActive: true };
    if (programId) where.programId = programId;
    return this.prisma.project.findMany({ where, include: { program: true }, orderBy: { projectName: 'asc' } });
  }
  createProject(data: any) { return this.prisma.project.create({ data: { projectName: data.projectName, programId: data.programId, legacyProjectId: data.legacyProjectId, isActive: data.isActive ?? true } }); }
  updateProject(id: number, data: any) { return this.prisma.project.update({ where: { id }, data }); }

  // --- Sub Projects CRUD ---
  findAllSubProjects() {
    return this.prisma.subProject.findMany({
      include: { program: true, project: true, teamAssignments: { include: { team: true } } },
      orderBy: { subProjectName: 'asc' },
    });
  }
  findSubProjects(projectId?: number) {
    const where: any = { isActive: true };
    if (projectId) where.projectId = projectId;
    return this.prisma.subProject.findMany({ where, orderBy: { subProjectName: 'asc' } });
  }
  createSubProject(data: any) {
    return this.prisma.subProject.create({ data: { subProjectName: data.subProjectName, programId: data.programId, projectId: data.projectId, legacySubProjectId: data.legacySubProjectId, isActive: data.isActive ?? true } });
  }
  updateSubProject(id: number, data: any) { return this.prisma.subProject.update({ where: { id }, data }); }

  // --- WBS ---
  findWbs() { return this.prisma.wbs.findMany({ where: { isActive: true }, orderBy: { description: 'asc' } }); }

  // --- Workstreams (sub projects grouped by team) ---
  async getWorkstreams(teamId?: number) {
    const where: any = { isActive: true };
    if (teamId) where.team = { id: teamId };
    return this.prisma.teamSubProjectAssignment.findMany({
      where,
      include: { team: { select: { id: true, teamName: true } }, subProject: { select: { subProjectName: true } } },
      orderBy: { teamId: 'asc' },
    });
  }
}
