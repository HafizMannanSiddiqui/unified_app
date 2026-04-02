import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth('JWT')
@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all teams with sub-teams and member count' })
  @ApiQuery({ name: 'isActive', required: false, example: 'true', description: 'Filter by active status' })
  findAll(@Query('isActive') isActive?: string) {
    return this.teamsService.findAll(isActive !== undefined ? isActive === 'true' : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single team by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new team or sub-team' })
  @ApiBody({ schema: { example: { teamName: 'AI/ML', parentId: 1, displayOrder: 0, isActive: true } } })
  create(@Body() body: any) {
    return this.teamsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a team' })
  @ApiBody({ schema: { example: { teamName: 'AI/ML Engineering', displayOrder: 1, isActive: true } } })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.teamsService.update(id, body);
  }
}
