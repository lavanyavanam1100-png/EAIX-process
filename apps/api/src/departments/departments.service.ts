import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    if (this.databaseService.isConnected()) {
      const rows = await this.databaseService.query<RowDataPacket[]>(
        'SELECT code, name FROM departments ORDER BY name ASC',
      );
      return rows.map((row) => ({
        code: String(row.code),
        name: String(row.name),
      }));
    }

    return [
      { code: 'PSC', name: 'PSC' },
      { code: 'MFG', name: 'MFG' },
    ];
  }
}
