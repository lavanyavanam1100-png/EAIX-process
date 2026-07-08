import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateContentDto } from './dto/create-content.dto';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async findAll(
    @Query('department') department?: string,
    @Query('section') section?: string,
    @Query('status') status?: string,
  ) {
    const filters: { department?: string; section?: string; status?: string } =
      {};
    if (department) filters.department = department;
    if (section) filters.section = section;
    if (status) filters.status = status;

    return this.contentService.findAll(filters);
  }

  @Get('by-section/:section')
  async findBySection(@Param('section') section: string) {
    if (!section) {
      throw new BadRequestException('Section is required');
    }
    return this.contentService.findBySection(section);
  }

  @Get('by-department/:department')
  async findByDepartment(@Param('department') department: string) {
    if (!department) {
      throw new BadRequestException('Department is required');
    }
    return this.contentService.findByDepartment(department);
  }

  @Get('by-user/:username')
  async findByUser(@Param('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }
    return this.contentService.findByUploader(username);
  }

  @Get('approved')
  async findApproved() {
    return this.contentService.findApproved();
  }

  @Get('pending-review')
  async findPendingReview() {
    return this.contentService.findPendingReview();
  }

  @Post()
  async create(@Body() payload: CreateContentDto) {
    return this.contentService.create(payload);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contentService.delete(id);
  }

  @Patch(':id/edit')
  async editDocument(
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    const record = await this.contentService.findOne(id);
    if (!record) {
      throw new NotFoundException('Document not found');
    }

    // Only allow editing for txt, doc, docx files
    const ext = record.fileName.split('.').pop()?.toLowerCase() ?? '';
    const editableExtensions = ['txt', 'doc', 'docx'];
    if (!editableExtensions.includes(ext)) {
      throw new BadRequestException(
        `File type .${ext} cannot be edited. Only txt, doc, and docx files are editable.`,
      );
    }

    // For now, store the content in the metadata field since we don't have a content field
    // In a real app, this would update the actual file or a content column
    const updated = await this.contentService.update(id, {
      metadata: body.content,
    });

    if (!updated) {
      throw new BadRequestException('Failed to update document');
    }

    return {
      id: updated.id,
      message: 'Document saved successfully',
      fileName: updated.fileName,
    };
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    const result = await this.contentService.getSummary(id);
    if (!result.ok) {
      throw new NotFoundException('Document not found');
    }
    return result;
  }

  @Patch(':id/summary/finalize')
  async finalizeSummary(
    @Param('id') id: string,
    @Body() body: { actor: string; summary: string },
  ) {
    if (!body?.actor) {
      throw new BadRequestException('Actor is required');
    }

    const summary = (body.summary ?? '').trim();
    if (!summary) {
      throw new BadRequestException('Summary is required');
    }

    const result = await this.contentService.finalizeSummary(
      id,
      body.actor,
      summary,
    );

    if (!result.ok && result.reason === 'NOT_FOUND') {
      throw new NotFoundException('Document not found');
    }

    if (!result.ok && result.reason === 'ONLY_OWNER_CAN_FINALIZE') {
      throw new BadRequestException(
        'Only the file owner can finalize the summary',
      );
    }

    return { ok: true };
  }

  @Get(':id/view')
  async viewDocument(@Param('id') id: string, @Res() res: Response) {
    const record = await this.contentService.findOne(id);
    if (!record) {
      throw new NotFoundException('Document not found');
    }

    const ext = record.fileName.split('.').pop()?.toLowerCase() ?? '';

    // Skip preview for binary files and unsupported types
    if (['zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
      return res.json({
        id: record.id,
        title: record.title,
        fileName: record.fileName,
        extension: ext,
        uploadedBy: record.uploadedBy,
        departmentCode: record.departmentCode,
        sectionCode: record.sectionCode,
        version: record.version,
        status: record.status,
        previewable: false,
        message: `${ext.toUpperCase()} files cannot be previewed. Please download to view.`,
      });
    }

    // For image files
    if (['png', 'jpg', 'jpeg', 'img'].includes(ext)) {
      return res.json({
        id: record.id,
        title: record.title,
        fileName: record.fileName,
        extension: ext,
        uploadedBy: record.uploadedBy,
        departmentCode: record.departmentCode,
        sectionCode: record.sectionCode,
        version: record.version,
        status: record.status,
        previewable: true,
        type: 'image',
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        content: `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      });
    }

    // For text-based files (CSV, TXT, etc.)
    let content = '';
    if (ext === 'csv') {
      content = `Title,Department,Section,Version,Status,UploadedBy,UploadedAt
${record.title},${record.departmentCode},${record.sectionCode},${record.version},${record.status},${record.uploadedBy},${new Date(record.uploadedAt).toISOString()}`;
    } else {
      content = `Document: ${record.title}
File: ${record.fileName}
Department: ${record.departmentCode}
Section: ${record.sectionCode}
Uploaded By: ${record.uploadedBy}
Uploaded At: ${new Date(record.uploadedAt).toISOString()}
Status: ${record.status}
Version: ${record.version}

--- Document Content ---
This is a preview of: ${record.fileName}`;
    }

    return res.json({
      id: record.id,
      title: record.title,
      fileName: record.fileName,
      extension: ext,
      uploadedBy: record.uploadedBy,
      departmentCode: record.departmentCode,
      sectionCode: record.sectionCode,
      version: record.version,
      status: record.status,
      previewable: true,
      type: 'text',
      content,
    });
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const record = await this.contentService.findOne(id);
    if (!record) {
      throw new NotFoundException('Document not found');
    }

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      img: 'image/octet-stream',
    };

    const ext = record.fileName.split('.').pop()?.toLowerCase() ?? 'txt';
    const mimeType = mimeTypes[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${record.fileName}"`,
    );
    res.send(
      `Document export\n\nTitle: ${record.title}\nFile: ${record.fileName}\nUploaded by: ${record.uploadedBy}\nStatus: ${record.status}\nVersion: ${record.version}`,
    );
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.contentService.setStatus(id, 'APPROVED');
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string) {
    return this.contentService.setStatus(id, 'REJECTED');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }
}
