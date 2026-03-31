import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};
    return this.prisma.team.findMany({ where, orderBy: [{ displayOrder: 'asc' }, { teamName: 'asc' }] });
  }

  findOne(id: number) {
    return this.prisma.team.findUnique({ where: { id } });
  }

  create(data: { teamName: string; displayOrder?: number; isActive?: boolean }) {
    return this.prisma.team.create({ data });
  }

  update(id: number, data: { teamName?: string; displayOrder?: number; isActive?: boolean }) {
    return this.prisma.team.update({ where: { id }, data });
  }
}
