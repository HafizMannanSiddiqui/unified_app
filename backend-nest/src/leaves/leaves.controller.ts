import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { LeavesService } from './leaves.service';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  @Get()
  findAll(@Query('userId') userId?: string, @Query('status') status?: string) {
    return this.leavesService.findAll(userId ? +userId : undefined, status);
  }

  @Post()
  create(@Body() body: any) {
    return this.leavesService.create(body);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leavesService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.leavesService.reject(id, req.user.id);
  }

  @Get('balance/:userId')
  getBalance(@Param('userId', ParseIntPipe) userId: number) {
    return this.leavesService.getBalance(userId);
  }
}
