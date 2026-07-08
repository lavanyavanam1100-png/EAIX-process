import { Controller, Get } from '@nestjs/common';
import { MasterService } from './master.service';

@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('all')
  async getAllMasters() {
    return this.masterService.getAllMasters();
  }

  @Get('departments')
  async getDepartments() {
    return this.masterService.getDepartments();
  }

  @Get('roles')
  async getRoles() {
    return this.masterService.getRoles();
  }

  @Get('roles/approval')
  async getApprovalRoles() {
    return this.masterService.getApprovalRoles();
  }

  @Get('roles/master')
  async getMasterRoles() {
    return this.masterService.getMasterRoles();
  }

  @Get('sections')
  getSections() {
    return this.masterService.getSections();
  }

  @Get('settings')
  getSettings() {
    return this.masterService.getSettings();
  }
}
