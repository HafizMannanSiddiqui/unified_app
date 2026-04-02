import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: number, status?: string, managerId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (managerId) {
      const reportees = await this.prisma.$queryRaw<{ user_id: number }[]>`
        SELECT user_id FROM user_managers WHERE manager_id = ${managerId}`;
      where.userId = { in: reportees.map(r => r.user_id) };
    }
    return this.prisma.leave.findMany({
      where,
      include: {
        user: { select: { username: true, displayName: true } },
        confirmer: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: any) {
    return this.prisma.leave.create({
      data: {
        userId: data.userId,
        fromDate: new Date(data.fromDate),
        toDate: new Date(data.toDate),
        numberOfDays: data.numberOfDays,
        leaveType: data.leaveType,
        description: data.description,
        status: 'pending',
      },
    });
  }

  approve(id: number, confirmerId: number) {
    return this.prisma.leave.update({
      where: { id },
      data: { status: 'approved', confirmedBy: confirmerId },
    });
  }

  reject(id: number, confirmerId: number) {
    return this.prisma.leave.update({
      where: { id },
      data: { status: 'rejected', confirmedBy: confirmerId },
    });
  }

  async getBalance(userId: number) {
    const allowedLeaves = await this.prisma.counter.findUnique({ where: { moduleName: 'allowed_leaves' } });
    const allowed = allowedLeaves?.value || 20;

    const used = await this.prisma.leave.aggregate({
      where: { userId, status: 'approved' },
      _sum: { numberOfDays: true },
    });

    return { allowed, used: used._sum.numberOfDays || 0, remaining: allowed - (used._sum.numberOfDays || 0) };
  }
}
