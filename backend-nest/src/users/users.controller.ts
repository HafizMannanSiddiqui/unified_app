import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Team & Manager memberships
  @Get('my-teams')
  getMyTeams(@Query('userId') userId: string) {
    return this.usersService.getUserTeamsAndManagers(+userId);
  }

  @Post('team-membership')
  addTeamMembership(@Body() body: { userId: number; teamId: number; roleInTeam?: string; isPrimary?: boolean }) {
    return this.usersService.addTeamMembership(body.userId, body.teamId, body.roleInTeam, body.isPrimary);
  }

  @Post('team-membership/:id/remove')
  removeTeamMembership(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeTeamMembership(id);
  }

  @Post('manager')
  addManager(@Body() body: { userId: number; managerId: number; isPrimary?: boolean }) {
    return this.usersService.addManager(body.userId, body.managerId, body.isPrimary);
  }

  @Post('manager/:id/remove')
  removeManager(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeManager(id);
  }

  @Get('my-team-members')
  getMyTeamMembers(@Query('managerId') managerId: string) {
    return this.usersService.getMyTeamMembers(+managerId);
  }

  @Get('all-emails')
  getUserAllEmails(@Query('userId') userId: string) {
    return this.usersService.getUserWithAllEmails(+userId);
  }

  @Get('manager-history')
  getManagerHistory(@Query('userId') userId: string) {
    return this.usersService.getManagerHistory(+userId);
  }

  // ── Profile Change Requests ──
  @Post('profile-change')
  submitProfileChange(@Body() body: { userId: number; fieldName: string; newValue: string }) {
    return this.usersService.submitProfileChange(body.userId, body.fieldName, body.newValue);
  }

  @Get('my-change-requests')
  getMyChangeRequests(@Query('userId') userId: string) {
    return this.usersService.getMyChangeRequests(+userId);
  }

  @Get('pending-change-requests')
  getPendingChangeRequests() {
    return this.usersService.getPendingChangeRequests();
  }

  @Post('change-requests/:id/approve')
  approveChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.approveChangeRequest(id, req.user.id);
  }

  @Post('change-requests/:id/reject')
  rejectChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.rejectChangeRequest(id, req.user.id);
  }

  @Get('all-designations')
  getAllDesignations() { return this.usersService.getAllDesignations(); }

  // ── Device Management ──
  @Get('devices')
  getDevices() { return this.usersService.getDevices(); }

  @Put('devices/:id')
  updateDevice(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.updateDevice(id, body);
  }

  @Get('device-users')
  getDeviceUsers(@Query('search') search?: string) {
    return this.usersService.getDeviceUsers(search);
  }

  @Post('device-users')
  createDeviceUser(@Body() body: any) { return this.usersService.createDeviceUser(body); }

  @Put('device-users/:id')
  updateDeviceUser(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.updateDeviceUser(id, body);
  }

  @Post('device-users/:id/delete')
  deleteDeviceUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteDeviceUser(id);
  }

  @Get('directory')
  getDirectory(@Query('search') search?: string, @Query('teamId') teamId?: string) {
    return this.usersService.getDirectory(search, teamId ? +teamId : undefined);
  }

  @Get('holidays')
  getHolidays(@Query('year') year?: string) {
    return this.usersService.getHolidays(year ? +year : undefined);
  }

  @Post('holidays')
  createHoliday(@Body() body: any) { return this.usersService.createHoliday(body); }

  @Post('holidays/:id/delete')
  deleteHoliday(@Param('id', ParseIntPipe) id: number) { return this.usersService.deleteHoliday(id); }

  @Get('notifications')
  getNotifications(@Query('userId') userId: string) {
    return this.usersService.getNotificationCounts(+userId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(
      page ? +page : 1,
      pageSize ? +pageSize : 100,
      isActive !== undefined ? isActive === 'true' : undefined,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.update(id, body);
  }
}
