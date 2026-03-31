import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe, Request, Res, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { GtlService } from './gtl.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import { LEAD_ROLES } from '../common/ownership.helper';

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
  findTimeEntries(@Query() q: any) {
    return this.gtl.findTimeEntries({
      userId: q.userId ? +q.userId : undefined, from: q.from, to: q.to,
      status: q.status !== undefined ? +q.status : undefined,
      teamId: q.teamId ? +q.teamId : undefined,
      page: q.page ? +q.page : 1, pageSize: q.pageSize ? +q.pageSize : 50,
    });
  }

  @Post('time-entries')
  createTimeEntry(@Body() body: any) { return this.gtl.createTimeEntry(body); }

  @Put('time-entries/:id')
  async updateTimeEntry(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Request() req: any) {
    // Only owner can update their own pending entries
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!entry) throw new ForbiddenException('Entry not found');
    if (entry.userId !== req.user.id && !(await this.isLead(req.user.id))) throw new ForbiddenException('Not your entry');
    if (entry.status !== 0) throw new ForbiddenException('Cannot edit approved/rejected entries');
    return this.gtl.updateTimeEntry(id, body);
  }

  @Delete('time-entries/:id')
  async deleteTimeEntry(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!entry) throw new ForbiddenException('Entry not found');
    if (entry.userId !== req.user.id && !(await this.isLead(req.user.id))) throw new ForbiddenException('Not your entry');
    if (entry.status !== 0) throw new ForbiddenException('Cannot delete approved/rejected entries');
    return this.gtl.deleteTimeEntry(id);
  }

  // --- Timesheet Grouped by Week (ownership enforced) ---
  @Get('timesheet/grouped')
  async getTimesheetGrouped(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string, @Query('programId') programId?: string, @Request() req?: any) {
    // Employees can only see their own timesheet
    if (+userId !== req.user.id && !(await this.isLead(req.user.id))) {
      throw new ForbiddenException('You can only view your own timesheet');
    }
    return this.gtl.getTimesheetGrouped(+userId, +year || new Date().getFullYear(), +month || new Date().getMonth() + 1, programId ? +programId : undefined);
  }

  // --- Timesheet CSV Download ---
  @Get('timesheet/download')
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
  async approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // Block self-approval
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } });
    if (entry?.userId === req.user.id) throw new ForbiddenException('Cannot approve your own entries');
    return this.gtl.approveEntry(id, req.user.id);
  }

  @Post('approvals/:id/reject')
  async reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } });
    if (entry?.userId === req.user.id) throw new ForbiddenException('Cannot reject your own entries');
    return this.gtl.rejectEntry(id, req.user.id);
  }

  @Post('approvals/batch-approve')
  async batchApprove(@Body() body: { userId: number }, @Request() req: any) {
    if (body.userId === req.user.id) throw new ForbiddenException('Cannot approve your own entries');
    return this.gtl.batchApprove(body.userId, req.user.id);
  }

  @Get('approvals/pending-users')
  getPendingUsers() { return this.gtl.getUsersWithPendingEntries(); }

  @Get('approvals/pending-grouped')
  getPendingGrouped(@Query('userId') userId: string) {
    return this.gtl.getPendingEntriesGrouped(+userId);
  }

  // --- Resource Allocation ---
  @Get('resource-allocation')
  getResourceAllocation(@Query('year') year: string, @Query('month') month: string) {
    return this.gtl.getResourceAllocation(+year || new Date().getFullYear(), +month || new Date().getMonth() + 1);
  }

  @Get('project-allocation')
  getProjectAllocation(@Query('year') year: string, @Query('month') month: string) {
    return this.gtl.getProjectAllocation(+year || new Date().getFullYear(), +month || new Date().getMonth() + 1);
  }

  // --- Reports ---
  @Get('reports/team')
  getTeamReport(@Query('from') from: string, @Query('to') to: string, @Query('teamId') teamId?: string) {
    return this.gtl.getTeamReport(from, to, teamId ? +teamId : undefined);
  }

  @Get('reports/general')
  getGeneralReport(@Query() q: any) { return this.gtl.getGeneralReport(q); }

  // --- Programs CRUD ---
  @Get('programs')
  findPrograms(@Query('all') all?: string) { return all === 'true' ? this.gtl.findAllPrograms() : this.gtl.findPrograms(); }
  @Post('programs')
  createProgram(@Body() body: any) { return this.gtl.createProgram(body); }
  @Put('programs/:id')
  updateProgram(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateProgram(id, body); }

  // --- Projects CRUD ---
  @Get('projects')
  findProjects(@Query('programId') programId?: string, @Query('all') all?: string) {
    return all === 'true' ? this.gtl.findAllProjects() : this.gtl.findProjects(programId ? +programId : undefined);
  }
  @Post('projects')
  createProject(@Body() body: any) { return this.gtl.createProject(body); }
  @Put('projects/:id')
  updateProject(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateProject(id, body); }

  // --- Sub Projects CRUD ---
  @Get('sub-projects')
  findSubProjects(@Query('projectId') projectId?: string, @Query('all') all?: string) {
    return all === 'true' ? this.gtl.findAllSubProjects() : this.gtl.findSubProjects(projectId ? +projectId : undefined);
  }
  @Post('sub-projects')
  createSubProject(@Body() body: any) { return this.gtl.createSubProject(body); }
  @Put('sub-projects/:id')
  updateSubProject(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.gtl.updateSubProject(id, body); }

  // --- WBS ---
  @Get('wbs')
  findWbs() { return this.gtl.findWbs(); }

  // --- Workstreams ---
  @Get('workstreams')
  getWorkstreams(@Query('teamId') teamId?: string) { return this.gtl.getWorkstreams(teamId ? +teamId : undefined); }
}
