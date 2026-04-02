import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  findAll(isActive?: boolean) {
    const where: any = isActive !== undefined ? { isActive } : {};
    return this.prisma.team.findMany({
      where,
      include: {
        parent: { select: { id: true, teamName: true } },
        children: { select: { id: true, teamName: true, isActive: true }, orderBy: { teamName: 'asc' } },
        _count: { select: { memberships: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { teamName: 'asc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, teamName: true } },
        children: { select: { id: true, teamName: true, isActive: true } },
      },
    });
  }

  create(data: { teamName: string; parentId?: number; displayOrder?: number; isActive?: boolean }) {
    return this.prisma.team.create({ data });
  }

  update(id: number, data: { teamName?: string; parentId?: number; displayOrder?: number; isActive?: boolean }) {
    return this.prisma.team.update({ where: { id }, data });
  }
}
