import { Body, Controller, Get, Param, Put, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get('blood-groups')
  getBloodGroups() { return this.profilesService.getBloodGroupReport(); }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.profilesService.findAll(search);
  }

  @Get(':userId')
  findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.profilesService.findByUserId(userId);
  }

  @Put(':userId')
  upsert(@Param('userId', ParseIntPipe) userId: number, @Body() body: any) {
    return this.profilesService.upsert(userId, body);
  }
}
