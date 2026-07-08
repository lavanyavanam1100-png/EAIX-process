import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tables')
  async getTables() {
    return this.adminService.getTables();
  }

  @Get('data/:table')
  async getTableData(
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.adminService.getTableData(
      'content_records',
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getTableData('users', 1000, 0);
  }

  @Get('audit')
  async getAuditEvents(
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.adminService.getTableData(
      'audit_events',
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }
}
