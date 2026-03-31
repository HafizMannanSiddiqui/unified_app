import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAllRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  findAllModules() {
    return this.prisma.module.findMany({ orderBy: { id: 'asc' } });
  }

  getRolePermissions(roleId: number) {
    return this.prisma.roleHasPermission.findMany({
      where: { roleId },
      include: { module: { select: { slug: true, name: true } } },
    });
  }

  async updateRolePermissions(roleId: number, permissions: { moduleId: number; task: string; permission: boolean }[]) {
    for (const p of permissions) {
      await this.prisma.roleHasPermission.upsert({
        where: { roleId_moduleId_task: { roleId, moduleId: p.moduleId, task: p.task as any } },
        update: { permission: p.permission },
        create: { roleId, moduleId: p.moduleId, task: p.task as any, permission: p.permission },
      });
    }
    return this.getRolePermissions(roleId);
  }
}
