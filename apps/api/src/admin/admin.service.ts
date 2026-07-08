import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getTables() {
    try {
      const tables = await this.databaseService.query<RowDataPacket[]>(
        `SELECT TABLE_NAME, TABLE_ROWS, ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME`,
      );
      return { ok: true, tables };
    } catch (error) {
      return {
        ok: false,
        error: (error as Error).message,
        fallback: 'Using in-memory mode',
      };
    }
  }

  async getTableData(
    table: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    const allowedTables = [
      'content_records',
      'users',
      'roles',
      'departments',
      'audit_events',
    ];
    if (!allowedTables.includes(table)) {
      return { ok: false, error: 'Invalid table name' };
    }

    try {
      // Get count
      const countResult = await this.databaseService.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM ${table}`,
      );
      const total = Number(countResult[0]?.total ?? 0);

      // Get data
      const data = await this.databaseService.query<RowDataPacket[]>(
        `SELECT * FROM ${table} LIMIT :limit OFFSET :offset`,
        { limit, offset },
      );

      return {
        ok: true,
        table,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: (error as Error).message,
      };
    }
  }

  async getStats() {
    try {
      const contentCount = await this.databaseService.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM content_records',
      );
      const userCount = await this.databaseService.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users',
      );
      const auditCount = await this.databaseService.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM audit_events',
      );

      const approvedDocs = await this.databaseService.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM content_records WHERE status = 'APPROVED'`,
      );

      const summaryStats = await this.databaseService.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN summary_status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN summary_status = 'PENDING_OWNER_REVIEW' THEN 1 ELSE 0 END) as pending
         FROM content_records`,
      );

      return {
        ok: true,
        stats: {
          totalDocuments: Number(contentCount[0]?.count ?? 0),
          approvedDocuments: Number(approvedDocs[0]?.count ?? 0),
          totalUsers: Number(userCount[0]?.count ?? 0),
          totalAuditEvents: Number(auditCount[0]?.count ?? 0),
          summaryStatus: {
            total: Number(summaryStats[0]?.total ?? 0),
            approved: Number(summaryStats[0]?.approved ?? 0),
            pending: Number(summaryStats[0]?.pending ?? 0),
          },
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: (error as Error).message,
      };
    }
  }
}
