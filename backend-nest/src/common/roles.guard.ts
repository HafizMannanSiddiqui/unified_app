import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // No roles required = allow

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const userRoles = await this.prisma.userHasRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleNames = userRoles.map(ur => ur.role.name);
    return requiredRoles.some(role => roleNames.includes(role));
  }
}
