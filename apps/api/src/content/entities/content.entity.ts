export interface ContentRecord {
  id: string;
  title: string;
  departmentCode: 'PSC' | 'MFG';
  sectionCode: 'TECHNICAL' | 'NON_TECHNICAL' | 'SME';
  fileName: string;
  fileSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  version: number;
  summaryDraft?: string;
  summaryFinal?: string;
  summaryStatus?: 'PENDING_OWNER_REVIEW' | 'APPROVED';
  summaryApprovedBy?: string;
  summaryApprovedAt?: string;
}
