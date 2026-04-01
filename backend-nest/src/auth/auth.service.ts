import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let authenticated = false;

    // Try Argon2id first (new hashes start with $argon2id$)
    if (user.passwordHash && user.passwordHash.startsWith('$argon2')) {
      authenticated = await argon2.verify(user.passwordHash, password);
    }

    // Fallback to legacy MD5
    if (!authenticated && user.legacyPasswordMd5) {
      const md5 = createHash('md5').update(password).digest('hex');
      authenticated = md5 === user.legacyPasswordMd5;
    }

    if (!authenticated) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Upgrade to Argon2id if not already
    if (!user.passwordHash?.startsWith('$argon2')) {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,    // 64 MB
        timeCost: 3,          // 3 iterations
        parallelism: 4,       // 4 threads
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, legacyPasswordMd5: null },
      });
    }

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwt.sign(payload),
      token_type: 'bearer',
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const roleIds = user.roles.map((ur) => ur.roleId);
    const permissions = roleIds.length
      ? await this.prisma.roleHasPermission.findMany({
          where: { roleId: { in: roleIds }, permission: true },
          include: { module: { select: { slug: true } } },
        })
      : [];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      teamId: user.teamId,
      isActive: user.isActive,
      payrollCompany: user.payrollCompany,
      roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
      permissions: permissions.map((p) => ({ module: p.module.slug, task: p.task })),
    };
  }

  // Forgot password — verify username, generate reset token
  async forgotPassword(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) return { success: false, message: 'Username not found or inactive' };

    // Generate a simple token (in production, use crypto.randomBytes)
    const token = require('crypto').randomBytes(32).toString('hex');
    await this.prisma.user.update({ where: { id: user.id }, data: { resetLinkToken: token } });
    return { success: true, token, message: 'Identity verified' };
  }

  // Reset password using token
  async forgotPasswordReset(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { resetLinkToken: token } });
    if (!user) return { success: false, message: 'Invalid or expired token' };

    const hash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, legacyPasswordMd5: null, resetLinkToken: null },
    });
    return { success: true, message: 'Password reset successfully' };
  }

  // Utility: hash a new password
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }
}
