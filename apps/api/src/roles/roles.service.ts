import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RolesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    if (this.databaseService.isConnected()) {
      const rows = await this.databaseService.query<RowDataPacket[]>(
        'SELECT code, name FROM roles ORDER BY name ASC',
      );
      return rows.map((row) => ({
        code: String(row.code),
        name: String(row.name),
      }));
    }

    return [
      { code: 'DEVELOPER', name: 'Developer' },
      { code: 'TESTER', name: 'Tester' },
      { code: 'SME', name: 'SME' },
      { code: 'MANAGER', name: 'Manager' },
      { code: 'LEAD', name: 'Lead' },
      { code: 'DEPARTMENT_HEAD', name: 'Department Head' },
      { code: 'SUPER_USER', name: 'Super User' },
      { code: 'VICE_PRESIDENT', name: 'Vice President' },
    ];
  }

  async findByCode(code: string) {
    const roles = await this.findAll();
    return roles.find((r) => r.code === code) || null;
  }

  async getApprovalRoles() {
    return (await this.findAll()).filter((r) =>
      ['LEAD', 'DEPARTMENT_HEAD', 'SUPER_USER'].includes(r.code),
    );
  }

  async getMasterRoles() {
    return (await this.findAll()).filter((r) =>
      ['SUPER_USER', 'DEPARTMENT_HEAD', 'VICE_PRESIDENT'].includes(r.code),
    );
  }
}
