import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { LeavesService } from './leaves.service';

@ApiTags('Leaves')
@ApiBearerAuth('JWT')
@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaves — filter by userId, status, or managerId (for leads)' })
  @ApiQuery({ name: 'userId', required: false, example: '469', description: 'Filter by employee ID' })
  @ApiQuery({ name: 'status', required: false, example: 'pending', description: 'Filter: pending, approved, rejected' })
  @ApiQuery({ name: 'managerId', required: false, example: '4', description: 'Show only this manager\'s reportees' })
  findAll(@Query('userId') userId?: string, @Query('status') status?: string, @Query('managerId') managerId?: string) {
    return this.leavesService.findAll(userId ? +userId : undefined, status, managerId ? +managerId : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Apply for leave' })
  @ApiBody({ schema: { example: { userId: 469, fromDate: '2026-04-10', toDate: '2026-04-12', numberOfDays: 3, leaveType: 'casual_leave', description: 'Family event' } } })
  create(@Body() body: any) {
    return this.leavesService.create(body);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a leave request (lead/admin)' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leavesService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a leave request (lead/admin)' })
  reject(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leavesService.reject(id, req.user.id);
  }

  @Get('balance/:userId')
  @ApiOperation({ summary: 'Get leave balance — allowed, used, remaining' })
  getBalance(@Param('userId', ParseIntPipe) userId: number) {
    return this.leavesService.getBalance(userId);
  }
}
