import { Injectable } from '@nestjs/common';
import { ContentService } from '../content/content.service';

interface ApprovalFilter {
  department?: string;
  section?: string;
}

interface ApprovalHistoryFilter {
  contentId?: string;
  approver?: string;
  limit?: number;
}

@Injectable()
export class ApprovalsService {
  // In-memory store for approval history/audit trail
  private approvalHistory: Array<{
    contentId: string;
    decision: string;
    approver: string;
    comments?: string;
    decidedAt: string;
  }> = [];

  constructor(private readonly contentService: ContentService) {}

  async findQueue(filters?: ApprovalFilter) {
    const content = await this.contentService.findAll();
    let queue = content.filter((item) => item.status === 'UNDER_REVIEW');

    if (filters?.department) {
      queue = queue.filter(
        (item) => item.departmentCode === filters.department,
      );
    }

    if (filters?.section) {
      queue = queue.filter((item) => item.sectionCode === filters.section);
    }

    return queue.map((item) => ({
      contentId: item.id,
      title: item.title,
      requestedBy: item.uploadedBy,
      departmentCode: item.departmentCode,
      sectionCode: item.sectionCode,
      fileName: item.fileName,
      uploadedAt: item.uploadedAt,
      status: item.status,
    }));
  }

  async getApprovalStats(department?: string, section?: string) {
    const content = await this.contentService.findAll();

    let filtered = content;
    if (department) {
      filtered = filtered.filter((item) => item.departmentCode === department);
    }
    if (section) {
      filtered = filtered.filter((item) => item.sectionCode === section);
    }

    const underReview = filtered.filter(
      (item) => item.status === 'UNDER_REVIEW',
    );
    const approved = filtered.filter((item) => item.status === 'APPROVED');
    const rejected = filtered.filter((item) => item.status === 'REJECTED');

    return {
      totalCount: filtered.length,
      underReviewCount: underReview.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      pendingPercentage:
        filtered.length > 0
          ? Math.round((underReview.length / filtered.length) * 100)
          : 0,
    };
  }

  getApprovalHistory(filters?: ApprovalHistoryFilter) {
    let history = [...this.approvalHistory];

    if (filters?.contentId) {
      history = history.filter((h) => h.contentId === filters.contentId);
    }

    if (filters?.approver) {
      history = history.filter((h) => h.approver === filters.approver);
    }

    const limit = filters?.limit ?? 50;
    return history.slice(-limit).reverse();
  }

  async getContentApprovalStatus(contentId: string) {
    const record = await this.contentService.findOne(contentId);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const history = this.approvalHistory.filter(
      (h) => h.contentId === contentId,
    );

    return {
      contentId,
      title: record.title,
      currentStatus: record.status,
      uploadedAt: record.uploadedAt,
      uploadedBy: record.uploadedBy,
      version: record.version,
      history: history.reverse(),
    };
  }

  async approve(contentId: string, approver: string) {
    const statusUpdate = await this.contentService.setStatus(
      contentId,
      'APPROVED',
    );

    if (statusUpdate.ok) {
      const approvalRecord = {
        contentId,
        decision: 'APPROVED' as const,
        approver,
        decidedAt: new Date().toISOString(),
      };
      this.approvalHistory.push(approvalRecord);
    }

    return {
      ...statusUpdate,
      contentId,
      decision: 'APPROVED',
      approver,
      decidedAt: new Date().toISOString(),
    };
  }

  async reject(contentId: string, approver: string, comments: string) {
    const statusUpdate = await this.contentService.setStatus(
      contentId,
      'REJECTED',
    );

    if (statusUpdate.ok) {
      const approvalRecord = {
        contentId,
        decision: 'REJECTED' as const,
        approver,
        comments,
        decidedAt: new Date().toISOString(),
      };
      this.approvalHistory.push(approvalRecord);
    }

    return {
      ...statusUpdate,
      contentId,
      decision: 'REJECTED',
      approver,
      comments,
      decidedAt: new Date().toISOString(),
    };
  }
}
