import { Body, Controller, Get, Param, Put, Query, UseGuards, ParseIntPipe, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { LEAD_ROLES } from '../common/ownership.helper';

@ApiTags('Profiles')
@ApiBearerAuth('JWT')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService, private prisma: PrismaService) {}

  @Get('blood-groups')
  @ApiOperation({ summary: 'Get blood group report — all employees grouped by blood type' })
  getBloodGroups() { return this.profilesService.getBloodGroupReport(); }

  @Get()
  @ApiOperation({ summary: 'List all employee profiles' })
  @ApiQuery({ name: 'search', required: false, example: 'Abdul', description: 'Search by name' })
  findAll(@Query('search') search?: string) {
    return this.profilesService.findAll(search);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get full profile for an employee' })
  findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.profilesService.findByUserId(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Update employee profile (personal info, education, experience)' })
  @ApiBody({ schema: { example: { firstName: 'Abdul', lastName: 'Mannan', cnic: '35201-1234567-1', contactNo: '0307-9490459', bloodGroup: 'AB+', nationality: 'Pakistani', maritalStatus: 'single', dob: '1999-01-15' } } })
  async upsert(@Param('userId', ParseIntPipe) userId: number, @Body() body: any, @Request() req: any) {
    if (userId !== req.user.id) {
      const roles = await this.prisma.userHasRole.findMany({ where: { userId: req.user.id }, include: { role: true } });
      if (!roles.some(r => LEAD_ROLES.includes(r.role.name))) {
        throw new ForbiddenException('You can only edit your own profile');
      }
    }
    const isAdmin = (await this.prisma.userHasRole.findMany({ where: { userId: req.user.id }, include: { role: true } }))
      .some(r => ['super admin', 'Admin', 'Hr Manager'].includes(r.role.name));
    if (!isAdmin && body.dateOfJoining) {
      delete body.dateOfJoining;
    }
    return this.profilesService.upsert(userId, body);
  }
}
