import type { RoleCode } from "@repo/types";

const reviewAndVersionRoles: RoleCode[] = [
  "LEAD",
  "DEPARTMENT_HEAD",
  "SUPER_USER",
];

const settingsRoles: RoleCode[] = [
  "ADMIN",
  "SUPER_USER",
  "DEPARTMENT_HEAD",
  "VICE_PRESIDENT",
];

const documentEditorRoles: RoleCode[] = [
  "SUPER_USER",
  "DEPARTMENT_HEAD",
  "VICE_PRESIDENT",
];

export function canViewReview(role: RoleCode) {
  return reviewAndVersionRoles.includes(role);
}

export function canViewVersions(role: RoleCode) {
  return reviewAndVersionRoles.includes(role);
}

export function canViewSettings(role: RoleCode) {
  return settingsRoles.includes(role);
}

export function canManageUsers(role: RoleCode) {
  return settingsRoles.includes(role);
}

export function canEditDocument(
  role: RoleCode,
  actorUsername: string,
  uploadedBy: string,
) {
  if (actorUsername === uploadedBy) {
    return true;
  }

  return documentEditorRoles.includes(role);
}
