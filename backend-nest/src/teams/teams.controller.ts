import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  findAll(@Query('isActive') isActive?: string) {
    return this.teamsService.findAll(isActive !== undefined ? isActive === 'true' : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.teamsService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.teamsService.update(id, body);
  }
}
