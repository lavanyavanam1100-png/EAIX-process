import { Injectable } from '@nestjs/common';
import { DepartmentsService } from '../departments/departments.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class MasterService {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly rolesService: RolesService,
  ) {}

  async getDepartments() {
    return this.departmentsService.findAll();
  }

  async getRoles() {
    return this.rolesService.findAll();
  }

  async getApprovalRoles() {
    return this.rolesService.getApprovalRoles();
  }

  async getMasterRoles() {
    return this.rolesService.getMasterRoles();
  }

  getSections() {
    return [
      { code: 'TECHNICAL', label: 'Technical' },
      { code: 'NON_TECHNICAL', label: 'Non-Technical' },
      { code: 'SME', label: 'SME' },
    ];
  }

  getSettings() {
    return {
      platform: {
        name: 'Enterprise AI Experience Platform',
        version: '1.0.0',
      },
      features: {
        uploadEnabled: true,
        approvalEnabled: true,
        versioningEnabled: true,
        auditingEnabled: true,
      },
      policies: {
        uploadSizeLimit: 104857600, // 100MB in bytes
        retentionDays: 365,
        archiveAfterApprovedDays: 30,
      },
    };
  }

  async getAllMasters() {
    return {
      departments: await this.getDepartments(),
      roles: await this.getRoles(),
      sections: this.getSections(),
      approvalRoles: await this.getApprovalRoles(),
      masterRoles: await this.getMasterRoles(),
      settings: this.getSettings(),
    };
  }
}
