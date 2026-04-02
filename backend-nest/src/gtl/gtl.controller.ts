import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe, Request, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { GtlService } from './gtl.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import { LEAD_ROLES } from '../common/ownership.helper';

@ApiTags('GTL')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class GtlController {
  constructor(private gtl: GtlService, private prisma: PrismaService) {}

  // Helper: check if user is lead/admin
  private async isLead(userId: number): Promise<boolean> {
    const roles = await this.prisma.userHasRole.findMany({ where: { userId }, include: { role: true } });
    return roles.some(r => LEAD_ROLES.includes(r.role.name));
  }

  // --- Time Entries ---
  @Get('time-entries')
  @ApiOperation({ summary: 'List time entries with optional filters and pagination' })
  @ApiQuery({ name: 'userId', required: false, example: '469', description: 'Filter by user ID' })
  @ApiQuery({ name: 'from', required: false, example: '2026-04-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, example: '2026-04-30', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, example: '0', description: 'Entry status (0=pending, 1=approved, 2=rejected)' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team ID' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager ID' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, example: '50', description: 'Page size' })
  findTimeEntries(@Query() q: any) {
    return this.gtl.findTimeEntries({
      userId: q.userId ? +q.userId : undefined, from: q.from, to: q.to,
      status: q.status !== undefined ? +q.status : undefined,
      teamId: q.teamId ? +q.teamId : undefined, managerId: q.managerId ? +q.managerId : undefined,
      page: q.page ? +q.page : 1, pageSize: q.pageSize ? +q.pageSize : 50,
    });
  }

  @Post('time-entries')
  @ApiOperation({ summary: 'Create a new time entry' })
  @ApiBody({
    schema: { type: 'object' },
    examples: {
      default: {
        summary: 'Create time entry',
        value: { userId: 469, programId: 1, teamId: 1, projectId: 1, subProjectId: 1, workType: 1, productPhase: 'production', entryDate: '2026-04-01', description: 'Working on API documentation', wbsId: 1, hours: 8 },
      },
    },
  })
  createTimeEntry(@Body() body: any) { return this.gtl.createTimeEntry(body); }

  @Put('time-entries/:id')
  @ApiOperation({ summary: 'Update an existing time entry (owner only, pending entries only)' })
  @ApiBody({
    schema: { type: 'object' },
    examples: {
      default: {
        summary: 'Update time entry',
        value: { userId: 469, programId: 1, teamId: 1, projectId: 1, subProjectId: 1, workType: 1, productPhase: 'production', entryDate: '2026-04-01', description: 'Working on API documentation', wbsId: 1, hours: 8 },
      },
    },
  })
  async updateTimeEntry(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Request() req: any) {
    // Only owner can update their own pending entries
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!entry) throw new ForbiddenException('Entry not found');
    if (entry.userId !== req.user.id && !(await this.isLead(req.user.id))) throw new ForbiddenException('Not your entry');
    if (entry.status !== 0) throw new ForbiddenException('Cannot edit approved/rejected entries');
    return this.gtl.updateTimeEntry(id, body);
  }

  @Delete('time-entries/:id')
  @ApiOperation({ summary: 'Delete a time entry (owner only, pending entries only)' })
  async deleteTimeEntry(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!entry) throw new ForbiddenException('Entry not found');
    if (entry.userId !== req.user.id && !(await this.isLead(req.user.id))) throw new ForbiddenException('Not your entry');
    if (entry.status !== 0) throw new ForbiddenException('Cannot delete approved/rejected entries');
    return this.gtl.deleteTimeEntry(id);
  }

  // --- Timesheet Grouped by Week (ownership enforced) ---
  @Get('timesheet/grouped')
  @ApiOperation({ summary: 'Get timesheet entries grouped by week for a user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'User ID' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  @ApiQuery({ name: 'programId', required: false, example: '1', description: 'Filter by program ID' })
  async getTimesheetGrouped(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string, @Query('programId') programId?: string, @Request() req?: any) {
    // Employees can only see their own timesheet
    if (+userId !== req.user.id && !(await this.isLead(req.user.id))) {
      throw new ForbiddenException('You can only view your own timesheet');
    }
    return this.gtl.getTimesheetGrouped(+userId, +year || new Date().getFullYear(), +month || new Date().getMonth() + 1, programId ? +programId : undefined);
  }

  // --- Timesheet CSV Download ---
  @Get('timesheet/download')
  @ApiOperation({ summary: 'Download timesheet as CSV file' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'User ID' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  async downloadTimesheet(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string, @Res() res: Response) {
    const csv = await this.gtl.getTimesheetCsv(+userId, +year, +month);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const filename = `timesheet_${year}_${monthNames[+month - 1]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // --- Approvals ---
  @Post('approvals/:id/approve')
  @ApiOperation({ summary: 'Approve a time entry (leads/admins only, no self-approval)' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead')
  async approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // Block self-approval
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } });
    if (entry?.userId === req.user.id) throw new ForbiddenException('Cannot approve your own entries');
    return this.gtl.approveEntry(id, req.user.id);
  }

  @Post('approvals/:id/reject')
  @ApiOperation({ summary: 'Reject a time entry (leads/admins only, no self-rejection)' })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead')
  async reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } });
    if (entry?.userId === req.user.id) throw new ForbiddenException('Cannot reject your own entries');
    return this.gtl.rejectEntry(id, req.user.id);
  }

  @Post('approvals/batch-approve')
  @ApiOperation({ summary: 'Batch approve all pending entries for a user (leads/admins only)' })
  @ApiBody({
    schema: { type: 'object', properties: { userId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Batch approve entries for user',
        value: { userId: 469 },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('super admin', 'Admin', 'Application Manager', 'Team Lead')
  async batchApprove(@Body() body: { userId: number }, @Request() req: any) {
    if (body.userId === req.user.id) throw new ForbiddenException('Cannot approve your own entries');
    return this.gtl.batchApprove(body.userId, req.user.id);
  }

  @Get('approvals/pending-users')
  @ApiOperation({ summary: 'List users who have pending time entries awaiting approval' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager ID' })
  getPendingUsers(@Query('managerId') managerId?: string) {
    return this.gtl.getUsersWithPendingEntries(managerId ? +managerId : undefined);
  }

  @Get('approvals/pending-grouped')
  @ApiOperation({ summary: 'Get pending entries grouped for a specific user' })
  @ApiQuery({ name: 'userId', required: true, example: '469', description: 'User ID' })
  getPendingGrouped(@Query('userId') userId: string) {
    return this.gtl.getPendingEntriesGrouped(+userId);
  }

  // --- Resource Allocation ---
  @Get('resource-allocation')
  @ApiOperation({ summary: 'Get resource allocation overview for a given month' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  getResourceAllocation(@Query('year') year: string, @Query('month') month: string) {
    return this.gtl.getResourceAllocation(+year || new Date().getFullYear(), +month || new Date().getMonth() + 1);
  }

  @Get('project-allocation')
  @ApiOperation({ summary: 'Get project allocation overview for a given month' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Year' })
  @ApiQuery({ name: 'month', required: true, example: '4', description: 'Month (1-12)' })
  getProjectAllocation(@Query('year') year: string, @Query('month') month: string) {
    return this.gtl.getProjectAllocation(+year || new Date().getFullYear(), +month || new Date().getMonth() + 1);
  }

  // --- Reports ---
  @Get('reports/team')
  @ApiOperation({ summary: 'Get team report for a date range' })
  @ApiQuery({ name: 'from', required: true, example: '2026-04-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, example: '2026-04-30', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team ID' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Filter by manager ID' })
  getTeamReport(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string, @Query('managerId') managerId?: string) {
    return this.gtl.getTeamReport(from, to, teamId ? +teamId : undefined, managerId ? +managerId : undefined);
  }

  @Get('reports/general')
  @ApiOperation({ summary: 'Get general report with flexible filters' })
  @ApiQuery({ name: 'from', required: false, example: '2026-04-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, example: '2026-04-30', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'userId', required: false, example: '469', description: 'Filter by user ID' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team ID' })
  @ApiQuery({ name: 'programId', required: false, example: '1', description: 'Filter by program ID' })
  @ApiQuery({ name: 'projectId', required: false, example: '1', description: 'Filter by project ID' })
  getGeneralReport(@Query() q: any) { return this.gtl.getGeneralReport(q); }

  // --- Programs CRUD ---
  @Get('programs')
  @ApiOperation({ summary: 'List programs (optionally include inactive)' })
  @ApiQuery({ name: 'all', required: false, example: 'true', description: 'Set to "true" to include inactive programs' })
  findPrograms(@Query('all') all?: string) { return all === 'true' ? this.gtl.findAllPrograms() : this.gtl.findPrograms(); }

  @Post('programs')
  @ApiOperation({ summary: 'Create a new program' })
  @ApiBody({
    schema: { type: 'object', properties: { programName: { type: 'string' } } },
    examples: {
      default: {
        summary: 'Create program',
        value: { programName: 'New Program' },
      },
    },
  })
  createProgram(@Body() body: any) { return this.gtl.createProgram(body); }

  @Put('programs/:id')
  @ApiOperation({ summary: 'Update an existing program' })
  @ApiBody({
    schema: { type: 'object', properties: { programName: { type: 'string' } } },
    examples: {
      default: {
        summary: 'Update program',
        value: { programName: 'New Program' },
      },
    },
  })
  updateProgram(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateProgram(id, body); }

  // --- Projects CRUD ---
  @Get('projects')
  @ApiOperation({ summary: 'List projects (optionally filter by program)' })
  @ApiQuery({ name: 'programId', required: false, example: '1', description: 'Filter by program ID' })
  @ApiQuery({ name: 'all', required: false, example: 'true', description: 'Set to "true" to include inactive projects' })
  findProjects(@Query('programId') programId?: string, @Query('all') all?: string) {
    return all === 'true' ? this.gtl.findAllProjects() : this.gtl.findProjects(programId ? +programId : undefined);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({
    schema: { type: 'object', properties: { projectName: { type: 'string' }, programId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Create project',
        value: { projectName: 'New Project', programId: 1 },
      },
    },
  })
  createProject(@Body() body: any) { return this.gtl.createProject(body); }

  @Put('projects/:id')
  @ApiOperation({ summary: 'Update an existing project' })
  @ApiBody({
    schema: { type: 'object', properties: { projectName: { type: 'string' }, programId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Update project',
        value: { projectName: 'New Project', programId: 1 },
      },
    },
  })
  updateProject(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateProject(id, body); }

  // --- Sub Projects CRUD ---
  @Get('sub-projects')
  @ApiOperation({ summary: 'List sub-projects (optionally filter by project)' })
  @ApiQuery({ name: 'projectId', required: false, example: '1', description: 'Filter by project ID' })
  @ApiQuery({ name: 'all', required: false, example: 'true', description: 'Set to "true" to include inactive sub-projects' })
  findSubProjects(@Query('projectId') projectId?: string, @Query('all') all?: string) {
    return all === 'true' ? this.gtl.findAllSubProjects() : this.gtl.findSubProjects(projectId ? +projectId : undefined);
  }

  @Post('sub-projects')
  @ApiOperation({ summary: 'Create a new sub-project' })
  @ApiBody({
    schema: { type: 'object', properties: { subProjectName: { type: 'string' }, projectId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Create sub-project',
        value: { subProjectName: 'New Sub-Project', projectId: 1 },
      },
    },
  })
  createSubProject(@Body() body: any) { return this.gtl.createSubProject(body); }

  @Put('sub-projects/:id')
  @ApiOperation({ summary: 'Update an existing sub-project' })
  @ApiBody({
    schema: { type: 'object', properties: { subProjectName: { type: 'string' }, projectId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Update sub-project',
        value: { subProjectName: 'New Sub-Project', projectId: 1 },
      },
    },
  })
  updateSubProject(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateSubProject(id, body); }

  // --- Quick-add project/sub-project ---
  @Post('projects/quick-add')
  @ApiOperation({ summary: 'Quick-add a new project under a program' })
  @ApiBody({
    schema: { type: 'object', properties: { projectName: { type: 'string' }, programId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Quick-add project',
        value: { projectName: 'New Project', programId: 1 },
      },
    },
  })
  quickAddProject(@Body() body: { projectName: string; programId: number }) {
    return this.gtl.quickAddProject(body);
  }

  @Post('sub-projects/quick-add')
  @ApiOperation({ summary: 'Quick-add a new sub-project under a project' })
  @ApiBody({
    schema: { type: 'object', properties: { subProjectName: { type: 'string' }, programId: { type: 'number' }, projectId: { type: 'number' } } },
    examples: {
      default: {
        summary: 'Quick-add sub-project',
        value: { subProjectName: 'New Sub-Project', programId: 1, projectId: 1 },
      },
    },
  })
  quickAddSubProject(@Body() body: { subProjectName: string; programId: number; projectId: number }) {
    return this.gtl.quickAddSubProject(body);
  }

  // --- WBS ---
  @Get('wbs')
  @ApiOperation({ summary: 'List all WBS (Work Breakdown Structure) entries' })
  findWbs() { return this.gtl.findWbs(); }

  // --- Workstreams ---
  @Get('workstreams')
  @ApiOperation({ summary: 'List workstreams (optionally filter by team)' })
  @ApiQuery({ name: 'teamId', required: false, example: '1', description: 'Filter by team ID' })
  getWorkstreams(@Query('teamId') teamId?: string) { return this.gtl.getWorkstreams(teamId ? +teamId : undefined); }
}
