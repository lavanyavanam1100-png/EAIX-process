export type DepartmentCode = "PSC" | "MFG";

export type RoleCode =
  | "DEVELOPER"
  | "TESTER"
  | "SME"
  | "MANAGER"
  | "LEAD"
  | "DEPARTMENT_HEAD"
  | "SUPER_USER"
  | "VICE_PRESIDENT"
  | "ADMIN";

export type SectionCode = "TECHNICAL" | "NON_TECHNICAL" | "SME";

export const departments = [
  { code: "PSC", label: "PSC" },
  { code: "MFG", label: "MFG" },
] as const;

export const roles = [
  { code: "DEVELOPER", label: "Developer" },
  { code: "TESTER", label: "Tester" },
  { code: "SME", label: "SME" },
  { code: "MANAGER", label: "Manager" },
  { code: "LEAD", label: "Lead" },
  { code: "DEPARTMENT_HEAD", label: "Department Head" },
  { code: "SUPER_USER", label: "Super User" },
  { code: "VICE_PRESIDENT", label: "Vice President" },
  { code: "ADMIN", label: "Admin" },
] as const;

export const sections = [
  {
    code: "TECHNICAL",
    label: "Technical",
    description: "Engineering and delivery playbooks, architecture decisions, runbooks.",
  },
  {
    code: "NON_TECHNICAL",
    label: "Non-Technical",
    description: "Policies, process docs, onboarding guides, and operational links.",
  },
  {
    code: "SME",
    label: "SME",
    description: "Domain knowledge assets curated by subject matter experts.",
  },
] as const;

export type ContentStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface ContentRecord {
  id: string;
  title: string;
  department: DepartmentCode;
  section: SectionCode;
  fileName: string;
  fileSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  version: number;
  status: ContentStatus;
}
