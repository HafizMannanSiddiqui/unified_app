import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { AttendanceService } from './attendance.service';
import { ZktecoService } from './zkteco.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private zktecoService: ZktecoService,
  ) {}

  @Post('checkin')
  checkin(@Request() req: any, @Body() body: any) {
    return this.attendanceService.checkin(req.user.id, body.state, body.ip, body.hostname);
  }

  @Post('checkout')
  checkout(@Request() req: any, @Body() body: any) {
    return this.attendanceService.checkout(req.user.id, body.state, body.ip, body.hostname);
  }

  @Get('my')
  getMyAttendance(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.attendanceService.getMyAttendance(req.user.id, from, to);
  }

  @Get('holidays-month')
  getHolidaysForMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.attendanceService.getHolidaysForMonth(+year, +month);
  }

  @Get('today-dashboard')
  getTodayDashboard() {
    return this.attendanceService.getTodayDashboard();
  }

  @Get('daily-report')
  getDailyReport(@Query('date') date: string, @Query('teamId') teamId?: string) {
    return this.attendanceService.getDailyReport(date, teamId ? +teamId : undefined);
  }

  @Get('monthly-report')
  getMonthlyReport(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string) {
    return this.attendanceService.getMonthlyReport(+userId, +year, +month);
  }

  @Get('requests')
  findRequests(@Query('requesterId') requesterId?: string, @Query('status') status?: string) {
    return this.attendanceService.findRequests({
      requesterId: requesterId ? +requesterId : undefined,
      status: status !== undefined ? +status : undefined,
    });
  }

  @Get('requests/all')
  findAllRequests(@Query('status') status?: string) {
    return this.attendanceService.findAllRequests(status !== undefined ? +status : undefined);
  }

  @Post('requests')
  createRequest(@Request() req: any, @Body() body: any) {
    return this.attendanceService.createRequest({ ...body, requesterId: req.user.id });
  }

  @Post('requests/:id/approve')
  approveRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.attendanceService.approveRequest(id, req.user.id);
  }

  @Post('requests/:id/reject')
  rejectRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.attendanceService.rejectRequest(id, req.user.id);
  }

  // --- Weekend Assignments ---
  @Get('weekend-assignments')
  findWeekendAssignments(@Query('userId') userId?: string, @Query('year') year?: string) {
    return this.attendanceService.findWeekendAssignments(userId ? +userId : undefined, year ? +year : undefined);
  }

  @Post('weekend-assignments')
  createWeekendAssignment(@Request() req: any, @Body() body: any) {
    return this.attendanceService.createWeekendAssignment({ ...body, assignedBy: req.user.id });
  }

  @Post('weekend-assignments/:id/delete')
  deleteWeekendAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.deleteWeekendAssignment(id);
  }

  // --- Late Arrivals ---
  @Get('late-arrivals')
  getLateArrivals(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string) {
    return this.attendanceService.getLateArrivals(from, to, teamId ? +teamId : undefined);
  }

  // --- My Team ---
  @Get('my-team')
  getMyTeam(@Request() req: any) {
    return this.attendanceService.getMyTeam(req.user.id);
  }

  // --- WFH (leads/admins only) ---
  @Post('mark-wfh')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  markWfh(@Body() body: { userId: number; date: string }, @Request() req: any) {
    return this.attendanceService.markWfh(body.userId, body.date, req.user.id);
  }

  // --- Person Detail (leads/admins only) ---
  @Get('person-detail')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  async getPersonDetail(@Query('userId') userId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.attendanceService.getPersonDetail(+userId, from, to);
  }

  // --- Ghost Employees (admin only) ---
  @Get('ghost-employees')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager')
  getGhostEmployees(@Query('months') months?: string) {
    return this.attendanceService.getGhostEmployees(months ? +months : 6);
  }

  @Post('deactivate-user')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin')
  deactivateUser(@Body() body: { userId: number }) {
    return this.attendanceService.deactivateUser(body.userId);
  }

  // --- Team Lead Insights (leads/admins only) ---
  @Get('lead-insights')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  getLeadInsights(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string) {
    return this.attendanceService.getLeadInsights(from, to, teamId ? +teamId : undefined);
  }

  // --- ZKTeco Device Operations (admin only) ---
  @Post('zkteco/test-connection')
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin')
  testConnection(@Body() body: { ip: string }) {
    return this.zktecoService.testConnection(body.ip);
  }

  @Get('zkteco/device-info')
  getDeviceInfo(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceInfo(ip);
  }

  @Get('zkteco/device-users')
  getZkDeviceUsers(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceUsers(ip);
  }

  @Get('zkteco/device-logs')
  getDeviceLogs(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceLogs(ip);
  }

  @Post('zkteco/sync')
  syncDevice(@Body() body: { deviceId: number }) {
    return this.zktecoService.syncDevice(body.deviceId);
  }

  @Post('zkteco/sync-all')
  syncAllDevices() {
    return this.zktecoService.syncAllDevices();
  }

  @Post('zkteco/clear-logs')
  clearDeviceLogs(@Body() body: { ip: string; confirmPhrase: string }) {
    return this.zktecoService.clearDeviceLogs(body.ip, body.confirmPhrase);
  }

  // --- Employees Report ---
  @Get('employees-report')
  getEmployeesReport(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string) {
    return this.attendanceService.getEmployeesReport(from, to, teamId ? +teamId : undefined);
  }
}

// Public controller — no auth required
@Controller('public/attendance')
export class PublicAttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('today')
  getTodayPublic() {
    return this.attendanceService.getTodayDashboard();
  }

  @Post('kiosk-mark')
  async kioskMark(@Body() body: { username: string; password: string }) {
    return this.attendanceService.kioskMarkAttendance(body.username, body.password);
  }
}
