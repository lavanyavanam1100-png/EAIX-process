import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';

type SqlParams = Record<string, unknown> | unknown[];

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private connected = false;

  async onModuleInit() {
    const enabled =
      (process.env.MYSQL_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) {
      this.logger.warn('MYSQL_ENABLED=false. Using in-memory fallback.');
      return;
    }

    try {
      const host = process.env.MYSQL_HOST ?? '127.0.0.1';
      const port = Number(process.env.MYSQL_PORT ?? '3306');
      const user = process.env.MYSQL_USER ?? 'root';
      const password = process.env.MYSQL_PASSWORD ?? '';
      const database = process.env.MYSQL_DATABASE ?? 'enterprise_app';

      // Ensure the configured database exists before creating the app pool.
      const bootstrapPool = mysql.createPool({
        host,
        port,
        user,
        password,
        waitForConnections: true,
        connectionLimit: 2,
        namedPlaceholders: true,
      });
      await bootstrapPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      await bootstrapPool.end();

      this.pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
      });

      await this.pool.query('SELECT 1');
      this.connected = true;
      await this.ensureTables();
      await this.seedMasters();
      this.logger.log('MySQL connected and ready.');
    } catch (error) {
      this.connected = false;
      this.logger.warn(
        `MySQL connection unavailable for host=${process.env.MYSQL_HOST ?? '127.0.0.1'} port=${process.env.MYSQL_PORT ?? '3306'} user=${process.env.MYSQL_USER ?? 'root'} db=${process.env.MYSQL_DATABASE ?? 'enterprise_app'}. Falling back to in-memory mode. ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  isConnected() {
    return this.connected && this.pool !== null;
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: SqlParams) {
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }

    const [rows] = await this.pool.query<T>(sql, params as any);
    return rows;
  }

  async execute(sql: string, params?: SqlParams) {
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }

    await this.pool.execute(sql, params as any);
  }

  private async ensureTables() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        code VARCHAR(30) PRIMARY KEY,
        name VARCHAR(120) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        code VARCHAR(30) PRIMARY KEY,
        name VARCHAR(120) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS content_records (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department_code VARCHAR(30) NOT NULL,
        section_code VARCHAR(30) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        uploaded_by VARCHAR(120) NOT NULL,
        uploaded_at DATETIME NOT NULL,
        last_edited_by VARCHAR(120) DEFAULT NULL,
        last_edited_at DATETIME DEFAULT NULL,
        status VARCHAR(30) NOT NULL,
        version INT NOT NULL,
        summary_draft TEXT DEFAULT NULL,
        summary_final TEXT DEFAULT NULL,
        summary_status VARCHAR(30) DEFAULT 'PENDING_OWNER_REVIEW',
        summary_approved_by VARCHAR(120) DEFAULT NULL,
        summary_approved_at DATETIME DEFAULT NULL,
        INDEX idx_content_department (department_code),
        INDEX idx_content_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(120) NOT NULL,
        target_id VARCHAR(100) NOT NULL,
        occurred_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(120) PRIMARY KEY,
        department_code VARCHAR(30) NOT NULL,
        role_code VARCHAR(30) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        permissions_json TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_users_department (department_code),
        INDEX idx_users_role (role_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Backward-compatible migration for existing DBs created before password support.
    await this.execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT 'changeme';
    `);
  }

  private async seedMasters() {
    const deptRows = await this.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM departments',
    );
    const roleRows = await this.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM roles',
    );
    const userRows = await this.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM users',
    );

    if (Number(deptRows[0]?.count ?? 0) === 0) {
      await this.execute(
        'INSERT INTO departments (code, name) VALUES (:pscCode, :pscName), (:mfgCode, :mfgName)',
        {
          pscCode: 'PSC',
          pscName: 'PSC',
          mfgCode: 'MFG',
          mfgName: 'MFG',
        },
      );
    }

    if (Number(roleRows[0]?.count ?? 0) === 0) {
      await this.execute(
        `
          INSERT INTO roles (code, name)
          VALUES
            (:developerCode, :developerName),
            (:testerCode, :testerName),
            (:smeCode, :smeName),
            (:managerCode, :managerName),
            (:leadCode, :leadName),
            (:deptHeadCode, :deptHeadName),
            (:superUserCode, :superUserName),
            (:vicePresCode, :vicePresName),
            (:adminCode, :adminName)
        `,
        {
          developerCode: 'DEVELOPER',
          developerName: 'Developer',
          testerCode: 'TESTER',
          testerName: 'Tester',
          smeCode: 'SME',
          smeName: 'SME',
          managerCode: 'MANAGER',
          managerName: 'Manager',
          leadCode: 'LEAD',
          leadName: 'Lead',
          deptHeadCode: 'DEPARTMENT_HEAD',
          deptHeadName: 'Department Head',
          superUserCode: 'SUPER_USER',
          superUserName: 'Super User',
          vicePresCode: 'VICE_PRESIDENT',
          vicePresName: 'Vice President',
          adminCode: 'ADMIN',
          adminName: 'Admin',
        },
      );
    }

    if (Number(userRows[0]?.count ?? 0) === 0) {
      const now = new Date();
      await this.execute(
        `
          INSERT INTO users (
            username,
            department_code,
            role_code,
            password_hash,
            permissions_json,
            created_at,
            updated_at
          )
          VALUES
            (:user1, :dept1, :role1, :pass1, :perm1, :createdAt, :updatedAt),
            (:user2, :dept2, :role2, :pass2, :perm2, :createdAt, :updatedAt),
            (:user3, :dept3, :role3, :pass3, :perm3, :createdAt, :updatedAt),
            (:user4, :dept4, :role4, :pass4, :perm4, :createdAt, :updatedAt),
            (:user5, :dept5, :role5, :pass5, :perm5, :createdAt, :updatedAt),
            (:user6, :dept6, :role6, :pass6, :perm6, :createdAt, :updatedAt),
            (:user7, :dept7, :role7, :pass7, :perm7, :createdAt, :updatedAt)
        `,
        {
          user1: 'demo.user',
          dept1: 'PSC',
          role1: 'DEVELOPER',
          pass1: 'demo123',
          perm1: JSON.stringify([
            'upload:all-departments',
            'delete:own-unapproved',
            'edit:own-documents',
          ]),
          user2: 'manager.user',
          dept2: 'PSC',
          role2: 'MANAGER',
          pass2: 'manager123',
          perm2: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'edit:own-documents',
          ]),
          user3: 'lead.user',
          dept3: 'MFG',
          role3: 'LEAD',
          pass3: 'lead123',
          perm3: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'edit:own-documents',
          ]),
          user4: 'depthead.user',
          dept4: 'PSC',
          role4: 'DEPARTMENT_HEAD',
          pass4: 'depthead123',
          perm4: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'version:manage',
            'master:manage',
            'edit:all-documents',
            'users:manage',
          ]),
          user5: 'superuser.user',
          dept5: 'PSC',
          role5: 'SUPER_USER',
          pass5: 'super123',
          perm5: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'version:manage',
            'master:manage',
            'edit:all-documents',
            'users:manage',
          ]),
          user6: 'vicepresident.user',
          dept6: 'PSC',
          role6: 'VICE_PRESIDENT',
          pass6: 'vp123',
          perm6: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'version:manage',
            'master:manage',
            'edit:all-documents',
            'users:manage',
          ]),
          user7: 'admin.user',
          dept7: 'PSC',
          role7: 'ADMIN',
          pass7: 'admin123',
          perm7: JSON.stringify([
            'upload:all-departments',
            'approve:submissions',
            'version:manage',
            'master:manage',
            'edit:all-documents',
            'users:manage',
          ]),
          createdAt: now,
          updatedAt: now,
        },
      );
    }
  }
}
