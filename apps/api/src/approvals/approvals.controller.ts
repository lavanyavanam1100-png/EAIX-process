import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('queue')
  async queue(
    @Query('department') department?: string,
    @Query('section') section?: string,
  ) {
    const filters: { department?: string; section?: string } = {};
    if (department) filters.department = department;
    if (section) filters.section = section;

    return this.approvalsService.findQueue(filters);
  }

  @Get('queue/count')
  async queueCount(@Query('department') department?: string) {
    const queue = await this.approvalsService.findQueue(
      department ? { department } : undefined,
    );
    return { count: queue.length };
  }

  @Get('stats')
  async getStats(
    @Query('department') department?: string,
    @Query('section') section?: string,
  ): Promise<{
    totalCount: number;
    underReviewCount: number;
    approvedCount: number;
    rejectedCount: number;
    pendingPercentage: number;
  }> {
    return this.approvalsService.getApprovalStats(department, section);
  }

  @Get('history')
  getHistory(
    @Query('contentId') contentId?: string,
    @Query('approver') approver?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: { contentId?: string; approver?: string; limit?: number } =
      {};
    if (contentId) filters.contentId = contentId;
    if (approver) filters.approver = approver;
    if (limit) filters.limit = Math.min(Number(limit), 100);

    return this.approvalsService.getApprovalHistory(filters);
  }

  @Post(':contentId/approve')
  async approve(
    @Param('contentId') contentId: string,
    @Body('approver') approver: string,
  ) {
    if (!approver) {
      throw new BadRequestException('Approver is required');
    }
    return this.approvalsService.approve(contentId, approver);
  }

  @Post(':contentId/reject')
  async reject(
    @Param('contentId') contentId: string,
    @Body('approver') approver: string,
    @Body('comments') comments?: string,
  ) {
    if (!approver) {
      throw new BadRequestException('Approver is required');
    }
    return this.approvalsService.reject(
      contentId,
      approver,
      comments ?? 'Rejected.',
    );
  }

  @Get(':contentId/status')
  async getStatus(@Param('contentId') contentId: string) {
    return this.approvalsService.getContentApprovalStatus(contentId);
  }
}
