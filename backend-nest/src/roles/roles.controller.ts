import { Body, Controller, Get, Param, Put, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAllRoles();
  }

  @Get('modules')
  findModules() {
    return this.rolesService.findAllModules();
  }

  @Get(':id/permissions')
  getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  updatePermissions(@Param('id', ParseIntPipe) id: number, @Body() body: any[]) {
    return this.rolesService.updateRolePermissions(id, body);
  }
}
