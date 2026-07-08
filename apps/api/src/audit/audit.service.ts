import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async recentEvents() {
    if (this.databaseService.isConnected()) {
      const rows = await this.databaseService.query<RowDataPacket[]>(`
        SELECT action, actor, target_id, occurred_at
        FROM audit_events
        ORDER BY occurred_at DESC
        LIMIT 50
      `);

      return rows.map((row) => ({
        action: String(row.action),
        actor: String(row.actor),
        targetId: String(row.target_id),
        occurredAt: new Date(row.occurred_at as string).toISOString(),
      }));
    }

    return [
      {
        action: 'UPLOAD_SUBMITTED',
        actor: 'demo.user',
        targetId: 'sample-content',
        occurredAt: new Date().toISOString(),
      },
    ];
  }
}
