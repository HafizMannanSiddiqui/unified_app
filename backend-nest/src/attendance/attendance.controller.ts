import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { AttendanceService } from './attendance.service';
import { ZktecoService } from './zkteco.service';

@ApiTags('Attendance')
@ApiBearerAuth('JWT')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private zktecoService: ZktecoService,
  ) {}

  @Post('checkin')
  @ApiOperation({ summary: 'Check in the current user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        state: { type: 'string', example: 'manual' },
        ip: { type: 'string', example: '192.168.1.100' },
        hostname: { type: 'string', example: 'OFFICE-PC' },
      },
    },
    examples: {
      checkin: {
        summary: 'Manual checkin',
        value: { state: 'manual', ip: '192.168.1.100', hostname: 'OFFICE-PC' },
      },
    },
  })
  checkin(@Request() req: any, @Body() body: any) {
    return this.attendanceService.checkin(req.user.id, body.state, body.ip, body.hostname);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Check out the current user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        state: { type: 'string', example: 'manual' },
        ip: { type: 'string', example: '192.168.1.100' },
        hostname: { type: 'string', example: 'OFFICE-PC' },
      },
    },
    examples: {
      checkout: {
        summary: 'Manual checkout',
        value: { state: 'manual', ip: '192.168.1.100', hostname: 'OFFICE-PC' },
      },
    },
  })
  checkout(@Request() req: any, @Body() body: any) {
    return this.attendanceService.checkout(req.user.id, body.state, body.ip, body.hostname);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get attendance records for the current user' })
  @ApiQuery({ name: 'from', required: false, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: false, example: '2026-04-30', description: 'End date' })
  getMyAttendance(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.attendanceService.getMyAttendance(req.user.id, from, to);
  }

  @Get('holidays-month')
  @ApiOperation({ summary: 'Get holidays for a given month' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  getHolidaysForMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.attendanceService.getHolidaysForMonth(+year, +month);
  }

  @Get('today-dashboard')
  @ApiOperation({ summary: 'Get today\'s attendance dashboard summary' })
  getTodayDashboard() {
    return this.attendanceService.getTodayDashboard();
  }

  @Get('daily-report')
  @ApiOperation({ summary: 'Get daily attendance report' })
  @ApiQuery({ name: 'date', required: true, example: '2026-04-01', description: 'Report date' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  getDailyReport(@Query('date') date: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.getDailyReport(date, teamId ? +teamId : undefined, managerId ? +managerId : undefined);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Get monthly attendance report for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'User ID' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  getMonthlyReport(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string) {
    return this.attendanceService.getMonthlyReport(+userId, +year, +month);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Find attendance requests (filtered by requester or status)' })
  @ApiQuery({ name: 'requesterId', required: false, example: '469', description: 'Filter by requester user ID' })
  @ApiQuery({ name: 'status', required: false, example: '1', description: 'Filter by status' })
  findRequests(@Query('requesterId') requesterId?: string, @Query('status') status?: string) {
    return this.attendanceService.findRequests({
      requesterId: requesterId ? +requesterId : undefined,
      status: status !== undefined ? +status : undefined,
    });
  }

  @Get('requests/all')
  @ApiOperation({ summary: 'Find all attendance requests (admin/manager view)' })
  @ApiQuery({ name: 'status', required: false, example: '1', description: 'Filter by status' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  findAllRequests(@Query('status') status?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.findAllRequests(status !== undefined ? +status : undefined, managerId ? +managerId : undefined);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create a new attendance request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        attendanceType: { type: 'string', example: 'full_day' },
        checkinDate: { type: 'string', example: '2026-04-01' },
        checkinTime: { type: 'string', example: '09:00:00' },
        checkoutDate: { type: 'string', example: '2026-04-01' },
        checkoutTime: { type: 'string', example: '18:00:00' },
        description: { type: 'string', example: 'Forgot to check out' },
      },
    },
    examples: {
      attendanceRequest: {
        summary: 'Full day attendance request',
        value: { attendanceType: 'full_day', checkinDate: '2026-04-01', checkinTime: '09:00:00', checkoutDate: '2026-04-01', checkoutTime: '18:00:00', description: 'Forgot to check out' },
      },
    },
  })
  createRequest(@Request() req: any, @Body() body: any) {
    return this.attendanceService.createRequest({ ...body, requesterId: req.user.id });
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve an attendance request' })
  approveRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.attendanceService.approveRequest(id, req.user.id);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject an attendance request' })
  rejectRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.attendanceService.rejectRequest(id, req.user.id);
  }

  // --- Weekend Assignments ---
  @Get('weekend-assignments')
  @ApiOperation({ summary: 'List weekend assignments' })
  @ApiQuery({ name: 'userId', required: false, example: '469', description: 'Filter by user' })
  @ApiQuery({ name: 'year', required: false, example: '2026', description: 'Filter by year' })
  findWeekendAssignments(@Query('userId') userId?: string, @Query('year') year?: string) {
    return this.attendanceService.findWeekendAssignments(userId ? +userId : undefined, year ? +year : undefined);
  }

  @Post('weekend-assignments')
  @ApiOperation({ summary: 'Create a weekend assignment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        date: { type: 'string', example: '2026-04-11' },
        reason: { type: 'string', example: 'Project deadline' },
      },
    },
  })
  createWeekendAssignment(@Request() req: any, @Body() body: any) {
    return this.attendanceService.createWeekendAssignment({ ...body, assignedBy: req.user.id });
  }

  @Post('weekend-assignments/:id/delete')
  @ApiOperation({ summary: 'Delete a weekend assignment' })
  deleteWeekendAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.deleteWeekendAssignment(id);
  }

  // --- Late Arrivals ---
  @Get('late-arrivals')
  @ApiOperation({ summary: 'Get late arrival records' })
  @ApiQuery({ name: 'from', required: true, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: true, example: '2026-04-30', description: 'End date' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  getLateArrivals(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.getLateArrivals(from, to, teamId ? +teamId : undefined, '15:30:00', managerId ? +managerId : undefined);
  }

  // --- My Team ---
  @Get('my-team')
  @ApiOperation({ summary: 'Get team members of the current user' })
  getMyTeam(@Request() req: any) {
    return this.attendanceService.getMyTeam(req.user.id);
  }

  // --- WFH Management ---
  @Post('wfh/assign')
  @ApiOperation({ summary: 'Assign work-from-home to a user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        date: { type: 'string', example: '2026-04-10' },
        tasks: { type: 'string', example: 'Complete API documentation' },
      },
    },
    examples: {
      wfhAssign: {
        summary: 'Assign WFH',
        value: { userId: 469, date: '2026-04-10', tasks: 'Complete API documentation' },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  assignWfh(@Body() body: { userId: number; date: string; tasks: string }, @Request() req: any) {
    return this.attendanceService.assignWfh(body.userId, body.date, body.tasks, req.user.id);
  }

  @Get('wfh/records')
  @ApiOperation({ summary: 'Get work-from-home records' })
  @ApiQuery({ name: 'userId', required: false, example: '469', description: 'Filter by user' })
  @ApiQuery({ name: 'from', required: false, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: false, example: '2026-04-30', description: 'End date' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  getWfhRecords(@Query('userId') userId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.getWfhRecords(userId ? +userId : undefined, from, to, teamId ? +teamId : undefined, managerId ? +managerId : undefined);
  }

  @Post('wfh/submit-deliverables')
  @ApiOperation({ summary: 'Submit WFH deliverables' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        deliverables: { type: 'string', example: 'Completed all tasks' },
        hoursLogged: { type: 'number', example: 8 },
      },
    },
    examples: {
      wfhDeliverables: {
        summary: 'Submit deliverables',
        value: { id: 1, deliverables: 'Completed all tasks', hoursLogged: 8 },
      },
    },
  })
  submitWfhDeliverables(@Body() body: { id: number; deliverables: string; hoursLogged: number }) {
    return this.attendanceService.submitWfhDeliverables(body.id, body.deliverables, body.hoursLogged);
  }

  @Post('wfh/review')
  @ApiOperation({ summary: 'Review WFH deliverables' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        reviewNote: { type: 'string', example: 'Good work, approved.' },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead')
  reviewWfh(@Body() body: { id: number; reviewNote: string }, @Request() req: any) {
    return this.attendanceService.reviewWfh(body.id, body.reviewNote, req.user.id);
  }

  // --- Audit Logs (super admin only) ---
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get attendance audit logs' })
  @ApiQuery({ name: 'limit', required: false, example: '100', description: 'Max number of records to return' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin')
  getAuditLogs(@Query('limit') limit?: string) {
    return this.attendanceService.getAuditLogs(limit ? +limit : 100);
  }

  // --- Person Detail (leads/admins only) ---
  // Leads can only view their own reportees; admins can view anyone
  @Get('person-detail')
  @ApiOperation({ summary: 'Get detailed attendance for a specific person' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'User ID' })
  @ApiQuery({ name: 'from', required: true, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: true, example: '2026-04-30', description: 'End date' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  async getPersonDetail(@Query('userId') userId: string, @Query('from') from: string, @Query('to') to: string, @Request() req: any) {
    await this.attendanceService.verifyReporteeAccess(req.user.id, +userId);
    return this.attendanceService.getPersonDetail(+userId, from, to);
  }

  // --- Ghost Employees (admin only) ---
  @Get('ghost-employees')
  @ApiOperation({ summary: 'Find ghost employees with no attendance in recent months' })
  @ApiQuery({ name: 'months', required: false, example: '6', description: 'Number of months to look back' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager')
  getGhostEmployees(@Query('months') months?: string) {
    return this.attendanceService.getGhostEmployees(months ? +months : 6);
  }

  @Post('deactivate-user')
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin')
  deactivateUser(@Body() body: { userId: number }) {
    return this.attendanceService.deactivateUser(body.userId);
  }

  // --- Team Lead Insights (leads/admins only) ---
  @Get('lead-insights')
  @ApiOperation({ summary: 'Get team lead insights and analytics' })
  @ApiQuery({ name: 'from', required: true, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: true, example: '2026-04-30', description: 'End date' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager')
  getLeadInsights(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.getLeadInsights(from, to, teamId ? +teamId : undefined, managerId ? +managerId : undefined);
  }

  // --- ZKTeco Device Operations (admin only) ---
  @Post('zkteco/test-connection')
  @ApiOperation({ summary: 'Test connection to a ZKTeco device' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ip: { type: 'string', example: '192.168.1.201' },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin')
  testConnection(@Body() body: { ip: string }) {
    return this.zktecoService.testConnection(body.ip);
  }

  @Get('zkteco/device-info')
  @ApiOperation({ summary: 'Get ZKTeco device information' })
  @ApiQuery({ name: 'ip', required: true, example: '192.168.1.201', description: 'Device IP address' })
  getDeviceInfo(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceInfo(ip);
  }

  @Get('zkteco/device-users')
  @ApiOperation({ summary: 'Get users registered on a ZKTeco device' })
  @ApiQuery({ name: 'ip', required: true, example: '192.168.1.201', description: 'Device IP address' })
  getZkDeviceUsers(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceUsers(ip);
  }

  @Get('zkteco/device-logs')
  @ApiOperation({ summary: 'Get attendance logs from a ZKTeco device' })
  @ApiQuery({ name: 'ip', required: true, example: '192.168.1.201', description: 'Device IP address' })
  getDeviceLogs(@Query('ip') ip: string) {
    return this.zktecoService.getDeviceLogs(ip);
  }

  @Post('zkteco/sync')
  @ApiOperation({ summary: 'Sync attendance data from a specific ZKTeco device' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'number', example: 1 },
      },
    },
  })
  syncDevice(@Body() body: { deviceId: number }) {
    return this.zktecoService.syncDevice(body.deviceId);
  }

  @Post('zkteco/sync-all')
  @ApiOperation({ summary: 'Sync attendance data from all ZKTeco devices' })
  syncAllDevices() {
    return this.zktecoService.syncAllDevices();
  }

  @Post('zkteco/clear-logs')
  @ApiOperation({ summary: 'Clear attendance logs on a ZKTeco device' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ip: { type: 'string', example: '192.168.1.201' },
        confirmPhrase: { type: 'string', example: 'CLEAR-LOGS' },
      },
    },
  })
  clearDeviceLogs(@Body() body: { ip: string; confirmPhrase: string }) {
    return this.zktecoService.clearDeviceLogs(body.ip, body.confirmPhrase);
  }

  // --- Employees Report ---
  @Get('employees-report')
  @ApiOperation({ summary: 'Get employees attendance report' })
  @ApiQuery({ name: 'from', required: true, example: '2026-04-01', description: 'Start date' })
  @ApiQuery({ name: 'to', required: true, example: '2026-04-30', description: 'End date' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager' })
  getEmployeesReport(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.attendanceService.getEmployeesReport(from, to, teamId ? +teamId : undefined, managerId ? +managerId : undefined);
  }
}

// Public controller — no auth required
@ApiTags('Attendance (Public)')
@Controller('public/attendance')
export class PublicAttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s attendance dashboard (public, no auth)' })
  getTodayPublic() {
    return this.attendanceService.getTodayDashboard();
  }

  @Post('kiosk-mark')
  @ApiOperation({ summary: 'Mark attendance via kiosk (public, no auth)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'john.doe' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async kioskMark(@Body() body: { username: string; password: string }) {
    return this.attendanceService.kioskMarkAttendance(body.username, body.password);
  }
}
