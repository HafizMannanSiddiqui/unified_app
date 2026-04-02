import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Team & Manager memberships
  @Get('my-teams')
  @ApiOperation({ summary: 'Get teams and managers for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the user' })
  getMyTeams(@Query('userId') userId: string) {
    return this.usersService.getUserTeamsAndManagers(+userId);
  }

  @Post('team-membership')
  @ApiOperation({ summary: 'Add a user to a team' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        teamId: { type: 'number', example: 1 },
        roleInTeam: { type: 'string', example: 'AI/ML Developer' },
        isPrimary: { type: 'boolean', example: true },
      },
      required: ['userId', 'teamId'],
    },
  })
  addTeamMembership(@Body() body: { userId: number; teamId: number; roleInTeam?: string; isPrimary?: boolean }, @Request() req: any) {
    return this.usersService.addTeamMembership(body.userId, body.teamId, body.roleInTeam, body.isPrimary, req.user.id);
  }

  @Post('team-membership/:id/remove')
  @ApiOperation({ summary: 'Remove a team membership by ID' })
  removeTeamMembership(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.removeTeamMembership(id, req.user.id);
  }

  @Post('manager')
  @ApiOperation({ summary: 'Assign a manager to a user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        managerId: { type: 'number', example: 1 },
        isPrimary: { type: 'boolean', example: true },
      },
      required: ['userId', 'managerId'],
    },
  })
  addManager(@Body() body: { userId: number; managerId: number; isPrimary?: boolean }, @Request() req: any) {
    return this.usersService.addManager(body.userId, body.managerId, body.isPrimary, req.user.id);
  }

  @Post('manager/:id/remove')
  @ApiOperation({ summary: 'Remove a manager assignment by ID' })
  removeManager(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.removeManager(id, req.user.id);
  }

  @Get('my-team-members')
  @ApiOperation({ summary: 'Get all team members under a manager' })
  @ApiQuery({ name: 'managerId', required: true, example: '1', description: 'ID of the manager' })
  getMyTeamMembers(@Query('managerId') managerId: string) {
    return this.usersService.getMyTeamMembers(+managerId);
  }

  @Get('all-emails')
  @ApiOperation({ summary: 'Get all email addresses for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the user' })
  getUserAllEmails(@Query('userId') userId: string) {
    return this.usersService.getUserWithAllEmails(+userId);
  }

  @Get('manager-history')
  @ApiOperation({ summary: 'Get manager assignment history for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the user' })
  getManagerHistory(@Query('userId') userId: string) {
    return this.usersService.getManagerHistory(+userId);
  }

  // ── Admin: Change Employee Role/Team/Manager ──
  @Post('admin-change-employee')
  @ApiOperation({ summary: 'Admin: change an employee field (designation, team, manager, etc.)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        fieldName: { type: 'string', example: 'designation' },
        newValue: { type: 'string', example: 'Senior Developer' },
      },
      required: ['userId', 'fieldName', 'newValue'],
    },
  })
  adminChangeEmployee(@Body() body: { userId: number; fieldName: string; newValue: string }, @Request() req: any) {
    return this.usersService.adminChangeEmployee(body.userId, body.fieldName, body.newValue, req.user.id);
  }

  @Get('employee-history')
  @ApiOperation({ summary: 'Get change history for an employee' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the employee' })
  getEmployeeHistory(@Query('userId') userId: string) {
    return this.usersService.getEmployeeHistory(+userId);
  }

  // ── Profile Change Requests ──
  @Post('profile-change')
  @ApiOperation({ summary: 'Submit a profile change request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        fieldName: { type: 'string', example: 'designation' },
        newValue: { type: 'string', example: 'Senior Developer' },
      },
      required: ['userId', 'fieldName', 'newValue'],
    },
  })
  submitProfileChange(@Body() body: { userId: number; fieldName: string; newValue: string }) {
    return this.usersService.submitProfileChange(body.userId, body.fieldName, body.newValue);
  }

  @Get('my-change-requests')
  @ApiOperation({ summary: 'Get change requests submitted by a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the user' })
  getMyChangeRequests(@Query('userId') userId: string) {
    return this.usersService.getMyChangeRequests(+userId);
  }

  @Get('pending-change-requests')
  @ApiOperation({ summary: 'Get all pending profile change requests (admin)' })
  getPendingChangeRequests() {
    return this.usersService.getPendingChangeRequests();
  }

  @Post('change-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a profile change request' })
  approveChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.approveChangeRequest(id, req.user.id);
  }

  @Post('change-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a profile change request' })
  rejectChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.rejectChangeRequest(id, req.user.id);
  }

  @Get('all-designations')
  @ApiOperation({ summary: 'Get all available designations' })
  getAllDesignations() { return this.usersService.getAllDesignations(); }

  // ── Team Change Requests (Lead → Admin workflow) ──
  @Post('team-change-request')
  @ApiOperation({ summary: 'Submit a team change request (lead to admin workflow)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        teamId: { type: 'number', example: 1 },
        changeType: { type: 'string', example: 'transfer' },
        reason: { type: 'string', example: 'Project reassignment' },
      },
    },
  })
  submitTeamChangeRequest(@Body() body: any, @Request() req: any) {
    return this.usersService.submitTeamChangeRequest({ ...body, requestedBy: req.user.id });
  }

  @Get('team-change-requests')
  @ApiOperation({ summary: 'Get team change requests, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false, example: '0', description: 'Filter by status (numeric)' })
  getTeamChangeRequests(@Query('status') status?: string) {
    return this.usersService.getTeamChangeRequests(status !== undefined ? +status : undefined);
  }

  @Post('team-change-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a team change request' })
  approveTeamChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.approveTeamChangeRequest(id, req.user.id);
  }

  @Post('team-change-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a team change request' })
  rejectTeamChangeRequest(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.rejectTeamChangeRequest(id, req.user.id);
  }

  @Get('employee-full-info')
  @ApiOperation({ summary: 'Get full employee info including teams, managers, and history' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the employee' })
  getEmployeeFullInfo(@Query('userId') userId: string) {
    return this.usersService.getEmployeeFullInfo(+userId);
  }

  // ── Device Management ──
  @Get('devices')
  @ApiOperation({ summary: 'Get all devices' })
  getDevices() { return this.usersService.getDevices(); }

  @Post('devices')
  @ApiOperation({ summary: 'Create a new device' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'MacBook Pro 16"' },
        type: { type: 'string', example: 'Laptop' },
        serialNumber: { type: 'string', example: 'SN-2024-00123' },
      },
    },
  })
  createDevice(@Body() body: any) { return this.usersService.createDevice(body); }

  @Put('devices/:id')
  @ApiOperation({ summary: 'Update a device by ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'MacBook Pro 16"' },
        type: { type: 'string', example: 'Laptop' },
        serialNumber: { type: 'string', example: 'SN-2024-00123' },
      },
    },
  })
  updateDevice(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.updateDevice(id, body);
  }

  @Get('device-users')
  @ApiOperation({ summary: 'Get device users, optionally filtered by search term' })
  @ApiQuery({ name: 'search', required: false, example: 'john', description: 'Search by user name' })
  getDeviceUsers(@Query('search') search?: string) {
    return this.usersService.getDeviceUsers(search);
  }

  @Post('device-users')
  @ApiOperation({ summary: 'Assign a device to a user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        deviceId: { type: 'number', example: 1 },
        assignedDate: { type: 'string', example: '2026-04-01' },
      },
    },
  })
  createDeviceUser(@Body() body: any) { return this.usersService.createDeviceUser(body); }

  @Put('device-users/:id')
  @ApiOperation({ summary: 'Update a device-user assignment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 469 },
        deviceId: { type: 'number', example: 1 },
        returnedDate: { type: 'string', example: '2026-04-01' },
      },
    },
  })
  updateDeviceUser(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.updateDeviceUser(id, body);
  }

  @Post('device-users/:id/delete')
  @ApiOperation({ summary: 'Delete a device-user assignment' })
  deleteDeviceUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteDeviceUser(id);
  }

  @Get('directory')
  @ApiOperation({ summary: 'Get employee directory with optional search and team filter' })
  @ApiQuery({ name: 'search', required: false, example: 'john', description: 'Search by name or email' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team ID' })
  getDirectory(@Query('search') search?: string, @Query('teamId') teamId?: string) {
    return this.usersService.getDirectory(search, teamId ? +teamId : undefined);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Get holidays for a given year' })
  @ApiQuery({ name: 'year', required: false, example: '2026', description: 'Year to fetch holidays for' })
  getHolidays(@Query('year') year?: string) {
    return this.usersService.getHolidays(year ? +year : undefined);
  }

  @Post('holidays')
  @ApiOperation({ summary: 'Create a new holiday' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Eid ul-Fitr' },
        date: { type: 'string', example: '2026-03-20' },
        type: { type: 'string', example: 'Public Holiday' },
      },
    },
  })
  createHoliday(@Body() body: any) { return this.usersService.createHoliday(body); }

  @Post('holidays/:id/delete')
  @ApiOperation({ summary: 'Delete a holiday by ID' })
  deleteHoliday(@Param('id', ParseIntPipe) id: number) { return this.usersService.deleteHoliday(id); }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification counts for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'ID of the user' })
  getNotifications(@Query('userId') userId: string) {
    return this.usersService.getNotificationCounts(+userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users with pagination, active filter, and search' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, example: '100', description: 'Items per page (default 100)' })
  @ApiQuery({ name: 'isActive', required: false, example: 'true', description: 'Filter by active status' })
  @ApiQuery({ name: 'search', required: false, example: 'john', description: 'Search by name or email' })
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
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john.doe@company.com' },
        designation: { type: 'string', example: 'Senior Developer' },
        teamId: { type: 'number', example: 1 },
      },
    },
  })
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        designation: { type: 'string', example: 'Senior Developer' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Request() req: any) {
    return this.usersService.update(id, body, req.user.id);
  }
}
