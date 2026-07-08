import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

export interface UserProfile {
  username: string;
  departmentCode: string;
  roleCode: string;
  permissions: string[];
}

interface StoredUser extends UserProfile {
  password: string;
}

interface OnboardUserPayload {
  username: string;
  departmentCode: string;
  roleCode: string;
  password: string;
}

interface LoginPayload {
  username: string;
  roleCode: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Simulated user profiles - in production, would come from database/auth service
  private profiles: Record<string, StoredUser> = {
    'demo.user': {
      username: 'demo.user',
      departmentCode: 'PSC',
      roleCode: 'DEVELOPER',
      password: 'demo123',
      permissions: [
        'upload:all-departments',
        'delete:own-unapproved',
        'edit:approved',
      ],
    },
    'manager.user': {
      username: 'manager.user',
      departmentCode: 'PSC',
      roleCode: 'MANAGER',
      password: 'manager123',
      permissions: [
        'upload:all-departments',
        'delete:own-unapproved',
        'approve:submissions',
        'edit:approved',
      ],
    },
    'lead.user': {
      username: 'lead.user',
      departmentCode: 'MFG',
      roleCode: 'LEAD',
      password: 'lead123',
      permissions: [
        'upload:all-departments',
        'delete:own-unapproved',
        'approve:submissions',
        'version:manage',
        'edit:approved',
      ],
    },
    'depthead.user': {
      username: 'depthead.user',
      departmentCode: 'PSC',
      roleCode: 'DEPARTMENT_HEAD',
      password: 'depthead123',
      permissions: [
        'upload:all-departments',
        'approve:submissions',
        'version:manage',
        'master:view',
        'edit:approved',
      ],
    },
    'superuser.user': {
      username: 'superuser.user',
      departmentCode: 'PSC',
      roleCode: 'SUPER_USER',
      password: 'super123',
      permissions: [
        'upload:all-departments',
        'approve:submissions',
        'version:manage',
        'master:manage',
        'edit:approved',
        'audit:view',
      ],
    },
    'vicepresident.user': {
      username: 'vicepresident.user',
      departmentCode: 'PSC',
      roleCode: 'VICE_PRESIDENT',
      password: 'vp123',
      permissions: [
        'upload:all-departments',
        'approve:submissions',
        'version:manage',
        'master:manage',
        'edit:approved',
        'audit:view',
        'reports:view',
      ],
    },
    'admin.user': {
      username: 'admin.user',
      departmentCode: 'PSC',
      roleCode: 'ADMIN',
      password: 'admin123',
      permissions: [
        'upload:all-departments',
        'approve:submissions',
        'version:manage',
        'master:manage',
        'edit:all-documents',
        'users:manage',
      ],
    },
  };

  private sanitizeUser(user: StoredUser): UserProfile {
    return {
      username: user.username,
      departmentCode: user.departmentCode,
      roleCode: user.roleCode,
      permissions: user.permissions,
    };
  }

  private isAdminRole(roleCode: string) {
    return roleCode === 'ADMIN';
  }

  async login(payload: LoginPayload) {
    const username = payload.username.trim().toLowerCase();
    const password = payload.password;

    if (!username || !password) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (this.databaseService.isConnected()) {
      const rows = await this.databaseService.query<RowDataPacket[]>(
        `
          SELECT username, department_code, role_code, permissions_json, password_hash
          FROM users
          WHERE username = :username
          LIMIT 1
        `,
        { username },
      );

      if (rows.length === 0) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const row = rows[0];
      const profile = this.mapRowToUser(row);
      const storedPassword = String(row.password_hash ?? '');

      if (storedPassword !== password || profile.roleCode !== payload.roleCode) {
        throw new Error('INVALID_CREDENTIALS');
      }

      return { ok: true, user: profile };
    }

    const user = this.profiles[username];
    if (
      !user ||
      user.password !== password ||
      user.roleCode !== payload.roleCode
    ) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return { ok: true, user: this.sanitizeUser(user) };
  }

  async profile(username?: string) {
    if (this.databaseService.isConnected()) {
      const selected = username?.trim().toLowerCase() || 'demo.user';
      const rows = await this.databaseService.query<RowDataPacket[]>(
        `
          SELECT username, department_code, role_code, permissions_json
          FROM users
          WHERE username = :username
          LIMIT 1
        `,
        { username: selected },
      );

      if (rows.length > 0) {
        return this.mapRowToUser(rows[0]);
      }

      const fallbackRows = await this.databaseService.query<RowDataPacket[]>(
        `
          SELECT username, department_code, role_code, permissions_json
          FROM users
          ORDER BY username ASC
          LIMIT 1
        `,
      );

      if (fallbackRows.length > 0) {
        return this.mapRowToUser(fallbackRows[0]);
      }
    }

    const user = username && this.profiles[username] ? username : 'demo.user';
      return this.sanitizeUser(this.profiles[user]);
  }

  async listUsers(actorUsername?: string) {
    if (!actorUsername) {
      throw new Error('FORBIDDEN');
    }

    const actor = await this.profile(actorUsername);
    if (!actor || !this.isAdminRole(actor.roleCode)) {
      throw new Error('FORBIDDEN');
    }

    if (this.databaseService.isConnected()) {
      const rows = await this.databaseService.query<RowDataPacket[]>(
        `
          SELECT username, department_code, role_code, permissions_json
          FROM users
          ORDER BY username ASC
        `,
      );
      return rows.map((row) => this.mapRowToUser(row));
    }

    return Object.values(this.profiles)
      .map((profile) => this.sanitizeUser(profile))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async onboardUser(payload: OnboardUserPayload) {
    const username = payload.username.trim().toLowerCase();
    if (!username) {
      throw new Error('USERNAME_REQUIRED');
    }

    if (this.databaseService.isConnected()) {
      const existingRows = await this.databaseService.query<RowDataPacket[]>(
        `
          SELECT username
          FROM users
          WHERE username = :username
          LIMIT 1
        `,
        { username },
      );

      if (existingRows.length > 0) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      const permissions = this.getDefaultPermissions(payload.roleCode);
      const now = new Date().toISOString();

      await this.databaseService.execute(
        `
          INSERT INTO users (
            username,
            department_code,
            role_code,
            password_hash,
            permissions_json,
            created_at,
            updated_at
          ) VALUES (
            :username,
            :departmentCode,
            :roleCode,
            :passwordHash,
            :permissionsJson,
            :createdAt,
            :updatedAt
          )
        `,
        {
          username,
          departmentCode: payload.departmentCode,
          roleCode: payload.roleCode,
          passwordHash: payload.password,
          permissionsJson: JSON.stringify(permissions),
          createdAt: now,
          updatedAt: now,
        },
      );

      return {
        username,
        departmentCode: payload.departmentCode,
        roleCode: payload.roleCode,
        permissions,
      } satisfies UserProfile;
    }

    if (this.profiles[username]) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const user: StoredUser = {
      username,
      departmentCode: payload.departmentCode,
      roleCode: payload.roleCode,
      password: payload.password,
      permissions: this.getDefaultPermissions(payload.roleCode),
    };

    this.profiles[username] = user;
    return this.sanitizeUser(user);
  }

  private mapRowToUser(row: RowDataPacket): UserProfile {
    let permissions: string[] = [];
    const rawPermissions = String(row.permissions_json ?? '[]');
    try {
      const parsed = JSON.parse(rawPermissions) as unknown;
      if (Array.isArray(parsed)) {
        permissions = parsed.map((item) => String(item));
      }
    } catch {
      permissions = [];
    }

    return {
      username: String(row.username),
      departmentCode: String(row.department_code),
      roleCode: String(row.role_code),
      permissions,
    };
  }

  private getDefaultPermissions(roleCode: string): string[] {
    if (
      ['SUPER_USER', 'DEPARTMENT_HEAD', 'VICE_PRESIDENT', 'ADMIN'].includes(
        roleCode,
      )
    ) {
      return [
        'upload:all-departments',
        'approve:submissions',
        'version:manage',
        'master:manage',
        'edit:all-documents',
        'users:manage',
      ];
    }

    if (['LEAD', 'MANAGER'].includes(roleCode)) {
      return [
        'upload:all-departments',
        'approve:submissions',
        'edit:own-documents',
      ];
    }

    return [
      'upload:all-departments',
      'delete:own-unapproved',
      'edit:own-documents',
    ];
  }

  async validateUserRole(
    username: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    const profile = await this.profile(username);
    return profile && requiredRoles.includes(profile.roleCode);
  }

  async validateUserPermission(
    username: string,
    permission: string,
  ): Promise<boolean> {
    const profile = await this.profile(username);
    return profile && profile.permissions.includes(permission);
  }
}
