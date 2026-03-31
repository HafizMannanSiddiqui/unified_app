import { Body, Controller, Get, Param, Put, Query, UseGuards, ParseIntPipe, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { LEAD_ROLES } from '../common/ownership.helper';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService, private prisma: PrismaService) {}

  @Get('blood-groups')
  getBloodGroups() { return this.profilesService.getBloodGroupReport(); }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.profilesService.findAll(search);
  }

  @Get(':userId')
  findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.profilesService.findByUserId(userId);
  }

  @Put(':userId')
  async upsert(@Param('userId', ParseIntPipe) userId: number, @Body() body: any, @Request() req: any) {
    // Employees can only edit their own profile
    if (userId !== req.user.id) {
      const roles = await this.prisma.userHasRole.findMany({ where: { userId: req.user.id }, include: { role: true } });
      if (!roles.some(r => LEAD_ROLES.includes(r.role.name))) {
        throw new ForbiddenException('You can only edit your own profile');
      }
    }
    // Block employees from editing dateOfJoining (HR-only field)
    const isAdmin = (await this.prisma.userHasRole.findMany({ where: { userId: req.user.id }, include: { role: true } }))
      .some(r => ['super admin', 'Admin', 'Hr Manager'].includes(r.role.name));
    if (!isAdmin && body.dateOfJoining) {
      delete body.dateOfJoining;
    }
    return this.profilesService.upsert(userId, body);
  }
}
