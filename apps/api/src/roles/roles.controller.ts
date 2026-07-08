import { Controller, Get, Param } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    return this.rolesService.findByCode(code);
  }

  @Get('groups/approval')
  async getApprovalRoles() {
    return this.rolesService.getApprovalRoles();
  }

  @Get('groups/master')
  async getMasterRoles() {
    return this.rolesService.getMasterRoles();
  }
}
