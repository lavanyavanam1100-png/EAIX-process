export class CreateContentDto {
  title!: string;
  departmentCode!: 'PSC' | 'MFG';
  sectionCode!: 'TECHNICAL' | 'NON_TECHNICAL' | 'SME';
  fileName!: string;
  fileSizeBytes!: number;
  uploadedBy!: string;
  extractedText?: string;
}
