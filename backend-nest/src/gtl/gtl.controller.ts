import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe, Request, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { GtlService } from './gtl.service';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard)
export class GtlController {
  constructor(private gtl: GtlService) {}

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
  updateTimeEntry(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.gtl.updateTimeEntry(id, body);
  }

  @Delete('time-entries/:id')
  deleteTimeEntry(@Param('id', ParseIntPipe) id: number) {
    return this.gtl.deleteTimeEntry(id);
  }

  // --- Timesheet Grouped by Week ---
  @Get('timesheet/grouped')
  getTimesheetGrouped(@Query('userId') userId: string, @Query('year') year: string, @Query('month') month: string, @Query('programId') programId?: string) {
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
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.gtl.approveEntry(id, req.user.id);
  }

  @Post('approvals/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.gtl.rejectEntry(id, req.user.id);
  }

  @Post('approvals/batch-approve')
  batchApprove(@Body() body: { userId: number }, @Request() req: any) {
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
