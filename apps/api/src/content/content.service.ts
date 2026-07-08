import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { CreateContentDto } from './dto/create-content.dto';
import { ContentRecord } from './entities/content.entity';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ContentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  private readonly elevatedEditorRoles = [
    'SUPER_USER',
    'DEPARTMENT_HEAD',
    'VICE_PRESIDENT',
  ];

  private readonly allowedExtensions = [
    'img',
    'png',
    'jpeg',
    'jpg',
    'pdf',
    'xls',
    'xlsx',
    'csv',
    'doc',
    'docx',
    'txt',
    'json',
  ];

  private readonly summaryAgentName = 'EAIX Summary Agent';

  private records: ContentRecord[] = [
    {
      id: 'seed-psc-release-runbook',
      title: 'PSC Release Runbook',
      departmentCode: 'PSC',
      sectionCode: 'TECHNICAL',
      fileName: 'psc-release-runbook-v3.pdf',
      fileSizeBytes: 845120,
      uploadedBy: 'demo.user',
      uploadedAt: new Date().toISOString(),
      lastEditedBy: 'demo.user',
      lastEditedAt: new Date().toISOString(),
      status: 'APPROVED',
      version: 3,
      summaryDraft:
        'Release runbook for PSC technical teams covering deployment checks, rollback path, and post-release validation.',
      summaryFinal:
        'PSC release runbook with pre-release checks, rollback plan, and post-release validation steps for engineering teams.',
      summaryStatus: 'APPROVED',
      summaryApprovedBy: 'demo.user',
      summaryApprovedAt: new Date().toISOString(),
    },
  ];

  private buildGeneratedSummary(payload: {
    title: string;
    fileName: string;
    sectionCode: string;
    departmentCode: string;
    fileSizeBytes: number;
    uploadedBy: string;
    extractedText?: string;
  }) {
    const extracted = payload.extractedText?.trim();
    if (extracted) {
      const extension = payload.fileName.split('.').pop()?.toLowerCase() ?? '';
      const contentSummary = this.buildContentSummary(
        extension,
        extracted,
        payload.fileName,
      );
      if (contentSummary) {
        return contentSummary;
      }
    }

    const extension =
      payload.fileName.split('.').pop()?.toUpperCase() ?? 'FILE';
    const sizeKb = Math.max(1, Math.round(payload.fileSizeBytes / 1024));
    return [
      `${payload.title} (${extension}) for ${payload.departmentCode} ${payload.sectionCode.replace('_', '-')} teams.`,
      `Uploaded by ${payload.uploadedBy}; file size approx ${sizeKb} KB.`,
      `Use this document for process guidance and team alignment.`,
    ].join(' ');
  }

  private buildContentSummary(
    extension: string,
    extractedText: string,
    fileName: string,
  ) {
    const normalized = extractedText.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    const toSentence = (value: string) =>
      value.charAt(0).toUpperCase() + value.slice(1);

    const professionalSummary = (sections: {
      overview: string;
      structure?: string;
      keyInsights?: string;
      decisionSupport?: string;
      action?: string;
    }) => {
      const structureText = sections.structure ?? 'Not explicitly defined.';
      const insightsText =
        sections.keyInsights ?? sections.decisionSupport ?? 'Not explicitly defined.';

      return [
        'Overview:',
        `- ${sections.overview}`,
        'Structure:',
        `- ${structureText}`,
        'Key Insights:',
        `- ${insightsText}`,
      ].join('\n');
    };

    const inferBusinessTextSummary = () => {
      const lower = normalized.toLowerCase();
      const fileBase = fileName.replace(/\.[^/.]+$/, '');
      const screenMatches = [
        ...new Set(
          (normalized.match(
            /semi\s*co\s+[a-z0-9\-\s]{0,25}(?:screen|analysis|master data|module)/gi,
          ) ?? []).map((item) => item.replace(/\s+/g, ' ').trim()),
        ),
      ];

      const hasRequirementSignals =
        /requirement|mock|screen|workflow|flow|redirect|path|should|will display/.test(
          lower,
        ) || /mock|requirement|w\d/.test(fileBase.toLowerCase());

      if (!hasRequirementSignals) {
        return '';
      }

      const hasSemico = /semico|semi\s*co/.test(lower + ' ' + fileBase.toLowerCase());
      const waveMatch = fileBase.match(/\b(w\d+)\b/i) ?? lower.match(/\b(w\d+)\b/i);
      const releaseTag = waveMatch ? waveMatch[1].toUpperCase() : '';

      const redirectSignals =
        (lower.match(/redirect|path will be|rename suggestion|latest validated|last update on/g) ?? [])
          .length;

      const scopeText =
        screenMatches.length > 0
          ? `Primary screens/modules referenced: ${screenMatches
              .slice(0, 5)
              .join(', ')}.`
          : 'Primary focus is on module-level screen behavior and workflow expectations.';

      const overviewParts = [
        hasSemico ? 'Requirements/mock-up document for the SemiCo module' : 'Requirements/mock-up document',
        releaseTag ? `(${releaseTag})` : '',
        'covering expected screen behavior and process flow.',
      ].filter(Boolean);

      const decisionText =
        redirectSignals > 0
          ? 'Contains implementation-level direction (screen naming, redirects/navigation path, and display rules) that can be converted into build-ready acceptance criteria.'
          : 'Provides functional expectations that should be translated into clear acceptance criteria per screen.';

      return professionalSummary({
        overview: overviewParts.join(' ').replace(/\s+/g, ' ').trim(),
        structure: scopeText,
        keyInsights:
          'This appears to be a UI/functional specification rather than raw reference text, and is intended to align business and implementation teams on expected behavior.',
        decisionSupport: decisionText,
        action:
          'Use this as a baseline for sign-off: confirm screen list, finalize naming/redirect rules, and convert each item into testable user stories or QA scenarios.',
      });
    };

    // --- Image files ---
    if (normalized.startsWith('__IMAGE__')) {
      const formatMatch = normalized.match(/format=([^,]+)/);
      const sizeMatch = normalized.match(/size=([^,]+)/);
      const format = formatMatch ? formatMatch[1] : extension.toUpperCase();
      const size = sizeMatch ? sizeMatch[1] : 'unknown size';
      return professionalSummary({
        overview: `Image document in ${format} format (${size}).`,
        structure: 'Visual content only; no machine-readable tabular text extracted.',
        action: 'Use Preview to validate visual accuracy and Download for detailed inspection if needed.',
      });
    }

    // --- PDF files ---
    if (normalized.startsWith('__PDF__')) {
      const pageMatch = normalized.match(/pages=(\d+)/);
      const pageCount = pageMatch ? pageMatch[1] : 'unknown';
      const content = normalized.replace(/__PDF__pages=\d+/, '').replace(/\[Page \d+\]/g, '').trim();
      const words = content.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const snippet = words.slice(0, 70).join(' ');
      return professionalSummary({
        overview: `PDF document with ${pageCount} page(s) and approximately ${wordCount} words.`,
        structure: `Document starts with: "${snippet}${wordCount > 70 ? '...' : ''}"`,
        keyInsights: 'Content appears narrative/documentation-oriented and suitable for review workflows.',
        action: 'Use Summary for quick context and open View/Download for complete clause-level verification.',
      });
    }

    // --- DOCX files ---
    if (normalized.startsWith('__DOCX__')) {
      const content = normalized.replace('__DOCX__', '').trim();
      const words = content.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const snippet = words.slice(0, 70).join(' ');
      const inferredBusinessSummary = inferBusinessTextSummary();
      if (inferredBusinessSummary) {
        return inferredBusinessSummary;
      }
      return professionalSummary({
        overview: `Word document with approximately ${wordCount} words of extracted text.`,
        structure: `Opening context: "${snippet}${wordCount > 70 ? '...' : ''}"`,
        keyInsights: 'Suitable for policy/procedure communication with textual guidance.',
        decisionSupport:
          'Primarily descriptive content; use detailed document review to extract actionable decisions.',
        action: 'Review summary for context and use Download for full-section validation.',
      });
    }

    // --- DOC files (legacy Word binary) ---
    if (normalized.startsWith('__DOC__')) {
      const content = normalized.replace('__DOC__', '').trim();
      const words = content.split(/\s+/).filter(Boolean);
      const snippet = words.slice(0, 60).join(' ');
      const inferredBusinessSummary = inferBusinessTextSummary();
      if (inferredBusinessSummary) {
        return inferredBusinessSummary;
      }
      return professionalSummary({
        overview: 'Legacy Word (.doc) document detected with partial readable extraction.',
        structure: `Readable excerpt: "${snippet}${words.length > 60 ? '...' : ''}"`,
        keyInsights: 'Binary .doc format can limit extraction completeness compared with .docx.',
        decisionSupport:
          'Treat this summary as directional and validate critical requirements directly in the source file.',
        action: 'Prefer converting to .docx for higher-quality summaries and text extraction.',
      });
    }

    // --- Excel / XLSX files ---
    if (normalized.includes('__SHEET__') || extension === 'xlsx' || extension === 'xls') {
      const sheetMatches = [...extractedText.matchAll(/__SHEET__([^\n]+)\n(.*?)(?=__SHEET__|$)/gs)];
      if (sheetMatches.length > 0) {
        const sheetSummaries: string[] = [];
        let totalRows = 0;
        const uniqueColumns = new Set<string>();
        for (const match of sheetMatches) {
          const sheetName = match[1]?.trim();
          try {
            const rows = JSON.parse(match[2]?.trim() ?? '[]') as Record<string, unknown>[];
            const firstRow = rows[0];
            const keys = firstRow ? Object.keys(firstRow) : [];
            const keyPreview = keys.slice(0, 6).join(', ');
            totalRows += rows.length;
            keys.forEach((key) => uniqueColumns.add(key));
            sheetSummaries.push(`Sheet "${sheetName}": ${rows.length} row(s), ${keys.length} column(s) — ${keyPreview}`);
          } catch {
            sheetSummaries.push(`Sheet "${sheetName}": data present`);
          }
        }
        return professionalSummary({
          overview: `Excel workbook with ${sheetMatches.length} sheet(s), approximately ${totalRows} extracted row(s), and ${uniqueColumns.size} unique column(s).`,
          structure: sheetSummaries.join(' | '),
          keyInsights: uniqueColumns.size
            ? `Primary data dimensions include: ${Array.from(uniqueColumns)
                .slice(0, 8)
                .map((col) => toSentence(col))
                .join(', ')}.`
            : 'Workbook contains tabular data across one or more sheets.',
          action: 'Use this summary to confirm schema coverage, then preview/download to validate row-level values and formulas.',
        });
      }
    }

    // --- JSON files ---
    if (extension === 'json') {
      try {
        const parsed = JSON.parse(extractedText);
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        const firstObject = rows.find(
          (item) => item && typeof item === 'object' && !Array.isArray(item),
        ) as Record<string, unknown> | undefined;
        const keys = firstObject ? Object.keys(firstObject) : [];
        const keyPreview = keys.slice(0, 8).join(', ');
        const rowCount = rows.length;
        if (keys.length > 0) {
          return professionalSummary({
            overview: `JSON dataset with ${rowCount} record(s) and ${keys.length} field(s).`,
            structure: `Detected fields: ${keyPreview}`,
            keyInsights: 'Data is structured and suitable for API/testing/validation workflows.',
            action: 'Use Preview to inspect sample records and Download for full downstream validation.',
          });
        }
        return professionalSummary({
          overview: `JSON content with approximately ${rowCount} record(s).`,
          keyInsights: 'Dataset structure is present but explicit top-level field mapping is limited.',
          action: 'Preview and download for complete record-level validation.',
        });
      } catch {
        // Fall through to plain text handling.
      }
    }

    // --- CSV files ---
    if (extension === 'csv') {
      const lines = extractedText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '')).filter(Boolean);
        const rowCount = Math.max(0, lines.length - 1);
        const headerPreview = headers.slice(0, 8).join(', ');
        if (headers.length > 0) {
          return professionalSummary({
            overview: `CSV dataset with ${rowCount} row(s) and ${headers.length} column(s).`,
            structure: `Detected columns: ${headerPreview}`,
            keyInsights: 'Flat tabular structure suitable for quick reconciliation and quality checks.',
            action: 'Use summary for schema confirmation; preview/download for row-level validation.',
          });
        }
      }
    }

    // --- TXT and other plain text ---
    const words = normalized.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const snippet = words.slice(0, 70).join(' ');
    const inferredBusinessSummary = inferBusinessTextSummary();
    if (inferredBusinessSummary) {
      return inferredBusinessSummary;
    }
    return professionalSummary({
      overview: `Text document with approximately ${wordCount} words.`,
      structure: `Opening excerpt: "${snippet}${wordCount > 70 ? '...' : ''}"`,
      keyInsights: 'Narrative text appears available for guideline/reference consumption.',
      decisionSupport:
        'Use document sections to derive explicit acceptance criteria and ownership for implementation.',
      action: wordCount > 70
        ? 'Use summary for quick orientation and download for full detailed review.'
        : 'Preview or download for final verification.',
    });
  }

  async findAll(filters?: {
    department?: string;
    section?: string;
    status?: string;
  }) {
    let records = await this._findAllRecords();

    if (filters?.department) {
      records = records.filter((r) => r.departmentCode === filters.department);
    }

    if (filters?.section) {
      records = records.filter((r) => r.sectionCode === filters.section);
    }

    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    return records.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }

  async findOne(id: string) {
    const records = await this._findAllRecords();
    return records.find((r) => r.id === id) || null;
  }

  async findBySection(sectionCode: string) {
    return this.findAll({ section: sectionCode });
  }

  async findByDepartment(departmentCode: string) {
    return this.findAll({ department: departmentCode });
  }

  async findByUploader(username: string) {
    const all = await this._findAllRecords();
    return all
      .filter((item) => item.uploadedBy === username)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
  }

  async findApproved() {
    return this.findAll({ status: 'APPROVED' });
  }

  async findPendingReview() {
    return this.findAll({ status: 'UNDER_REVIEW' });
  }

  async create(payload: CreateContentDto) {
    const extension = payload.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!this.allowedExtensions.includes(extension)) {
      throw new BadRequestException('UNSUPPORTED_FILE_TYPE');
    }

    const now = new Date();
    const record: ContentRecord = {
      id: randomUUID(),
      title: payload.title,
      departmentCode: payload.departmentCode,
      sectionCode: payload.sectionCode,
      fileName: payload.fileName,
      fileSizeBytes: payload.fileSizeBytes,
      uploadedBy: payload.uploadedBy,
      uploadedAt: now.toISOString(),
      lastEditedBy: payload.uploadedBy,
      lastEditedAt: now.toISOString(),
      status: 'UNDER_REVIEW',
      version: 1,
      summaryDraft: this.buildGeneratedSummary(payload),
      summaryFinal: '',
      summaryStatus: 'PENDING_OWNER_REVIEW',
    };

    if (this.databaseService.isConnected()) {
      await this.databaseService.execute(
        `
          INSERT INTO content_records (
            id,
            title,
            department_code,
            section_code,
            file_name,
            file_size_bytes,
            uploaded_by,
            uploaded_at,
            last_edited_by,
            last_edited_at,
            status,
            version,
            summary_draft,
            summary_final,
            summary_status,
            summary_approved_by,
            summary_approved_at
          ) VALUES (
            :id,
            :title,
            :departmentCode,
            :sectionCode,
            :fileName,
            :fileSizeBytes,
            :uploadedBy,
            :uploadedAt,
            :lastEditedBy,
            :lastEditedAt,
            :status,
            :version,
            :summaryDraft,
            :summaryFinal,
            :summaryStatus,
            :summaryApprovedBy,
            :summaryApprovedAt
          )
        `,
        {
          id: record.id,
          title: record.title,
          departmentCode: record.departmentCode,
          sectionCode: record.sectionCode,
          fileName: record.fileName,
          fileSizeBytes: record.fileSizeBytes,
          uploadedBy: record.uploadedBy,
          uploadedAt: now,
          lastEditedBy: record.lastEditedBy,
          lastEditedAt: now,
          status: record.status,
          version: record.version,
          summaryDraft: record.summaryDraft,
          summaryFinal: record.summaryFinal,
          summaryStatus: record.summaryStatus,
          summaryApprovedBy: null,
          summaryApprovedAt: null,
        },
      );

      return { ok: true, id: record.id };
    }

    this.records.push(record);
    return { ok: true, id: record.id };
  }

  async delete(id: string) {
    if (this.databaseService.isConnected()) {
      await this.databaseService.execute(
        `DELETE FROM content_records WHERE id = :id`,
        { id },
      );

      return { ok: true, id };
    }

    this.records = this.records.filter((item) => item.id !== id);
    return { ok: true, id };
  }

  async bumpVersion(id: string, actor: string) {
    const records = await this._findAllRecords();
    const record = records.find((item) => item.id === id);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const actorProfile = await this.authService.profile(actor);
    const isOwner = record.uploadedBy === actor;
    const isElevated = this.elevatedEditorRoles.includes(actorProfile.roleCode);

    if (!isOwner && !isElevated) {
      return { ok: false, reason: 'EDIT_NOT_ALLOWED' };
    }

    if (this.databaseService.isConnected()) {
      const now = new Date();
      await this.databaseService.execute(
        `
          UPDATE content_records
          SET
            version = version + 1,
            last_edited_by = :actor,
            last_edited_at = :lastEditedAt
          WHERE id = :id
        `,
        { id, actor, lastEditedAt: now },
      );

      const refreshed = (await this._findAllRecords()).find(
        (item) => item.id === id,
      );
      return { ok: true, record: refreshed };
    }

    record.version += 1;
    record.lastEditedBy = actor;
    record.lastEditedAt = new Date().toISOString();
    return { ok: true, record };
  }

  async update(id: string, updates: Record<string, any>) {
    const records = await this._findAllRecords();
    const record = records.find((item) => item.id === id);
    if (!record) {
      throw new Error('Record not found');
    }

    if (this.databaseService.isConnected()) {
      const now = new Date();
      const updateFields = Object.keys(updates)
        .map((key) => `${key} = :${key}`)
        .join(', ');
      await this.databaseService.execute(
        `
          UPDATE content_records
          SET
            ${updateFields},
            last_edited_at = :lastEditedAt
          WHERE id = :id
        `,
        {
          id,
          ...updates,
          lastEditedAt: now,
        },
      );

      const refreshed = (await this._findAllRecords()).find(
        (item) => item.id === id,
      );
      return refreshed;
    }

    // In-memory update
    Object.assign(record, updates);
    record.lastEditedAt = new Date().toISOString();
    return record;
  }

  async getSummary(id: string) {
    const record = await this.findOne(id);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const summary =
      record.summaryStatus === 'APPROVED'
        ? (record.summaryFinal ?? '')
        : (record.summaryDraft ?? '');
    return {
      ok: true,
      id: record.id,
      title: record.title,
      status: record.summaryStatus ?? 'PENDING_OWNER_REVIEW',
      summary,
      canOwnerFinalize:
        (record.summaryStatus ?? 'PENDING_OWNER_REVIEW') !== 'APPROVED',
      summaryAgent: this.summaryAgentName,
      summaryApprovedBy: record.summaryApprovedBy ?? null,
      summaryApprovedAt: record.summaryApprovedAt ?? null,
      summaryDraft: record.summaryDraft ?? '',
      summaryFinal: record.summaryFinal ?? '',
      uploadedBy: record.uploadedBy,
    };
  }

  async finalizeSummary(id: string, actor: string, finalSummary: string) {
    const record = await this.findOne(id);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    if (record.uploadedBy !== actor) {
      return { ok: false, reason: 'ONLY_OWNER_CAN_FINALIZE' };
    }

    const approvedAt = new Date().toISOString();

    if (this.databaseService.isConnected()) {
      await this.databaseService.execute(
        `
          UPDATE content_records
          SET
            summary_final = :summaryFinal,
            summary_status = :summaryStatus,
            summary_approved_by = :summaryApprovedBy,
            summary_approved_at = :summaryApprovedAt,
            last_edited_by = :lastEditedBy,
            last_edited_at = :lastEditedAt
          WHERE id = :id
        `,
        {
          id,
          summaryFinal: finalSummary,
          summaryStatus: 'APPROVED',
          summaryApprovedBy: actor,
          summaryApprovedAt: new Date(approvedAt),
          lastEditedBy: actor,
          lastEditedAt: new Date(approvedAt),
        },
      );

      return { ok: true };
    }

    record.summaryFinal = finalSummary;
    record.summaryStatus = 'APPROVED';
    record.summaryApprovedBy = actor;
    record.summaryApprovedAt = approvedAt;
    record.lastEditedBy = actor;
    record.lastEditedAt = approvedAt;
    return { ok: true };
  }

  async setStatus(id: string, status: ContentRecord['status']) {
    const records = await this._findAllRecords();
    const record = records.find((item) => item.id === id);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    if (this.databaseService.isConnected()) {
      const now = new Date();
      await this.databaseService.execute(
        `
          UPDATE content_records
          SET
            status = :status,
            last_edited_at = :lastEditedAt
          WHERE id = :id
        `,
        {
          id,
          status,
          lastEditedAt: now,
        },
      );

      const refreshed = (await this._findAllRecords()).find(
        (item) => item.id === id,
      );
      return { ok: true, record: refreshed };
    }

    record.status = status;
    if (status === 'APPROVED' || status === 'REJECTED') {
      record.lastEditedAt = new Date().toISOString();
    }

    return { ok: true, record };
  }

  private async _findAllRecords(): Promise<ContentRecord[]> {
    if (this.databaseService.isConnected()) {
      try {
        const sql = 'SELECT * FROM content_records';
        const rows = await this.databaseService.query<RowDataPacket[]>(sql, {});
        return rows.map((row) => {
          const record: ContentRecord = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            id: row.id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            title: row.title,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            departmentCode: row.department_code,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            sectionCode: row.section_code,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            fileName: row.file_name,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            fileSizeBytes: row.file_size_bytes,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            uploadedBy: row.uploaded_by,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            uploadedAt: row.uploaded_at,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            lastEditedBy: row.last_edited_by,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            lastEditedAt: row.last_edited_at,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            status: row.status,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            version: row.version,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summaryDraft: row.summary_draft,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summaryFinal: row.summary_final,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summaryStatus: row.summary_status,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summaryApprovedBy: row.summary_approved_by,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summaryApprovedAt: row.summary_approved_at,
          };
          return record;
        });
      } catch (err) {
        console.error('Database query failed:', err);
        return this.records;
      }
    }

    return this.records;
  }
}
