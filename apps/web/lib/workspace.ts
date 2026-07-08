import type { DepartmentCode, RoleCode, SectionCode } from "@repo/types";
import { departments, roles, sections } from "@repo/types";

export interface WorkspaceSelection {
  department: DepartmentCode;
  role: RoleCode;
  section?: SectionCode;
}

export interface LoggedInUser {
  username: string;
  departmentCode: DepartmentCode;
  roleCode: RoleCode;
}

const STORAGE_KEY = "eaix-workspace-selection";
const USER_STORAGE_KEY = "eaix-active-user";

export function buildWorkspaceQuery(selection: WorkspaceSelection) {
  const params = new URLSearchParams();
  params.set("department", selection.department);
  params.set("role", selection.role);
  if (selection.section) {
    params.set("section", selection.section);
  }
  return params.toString();
}

export function persistWorkspace(selection: WorkspaceSelection) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

export function persistLoggedInUser(user: LoggedInUser) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function readLoggedInUser(): LoggedInUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoggedInUser;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function readWorkspaceSelection(): WorkspaceSelection | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as WorkspaceSelection;
  } catch {
    return null;
  }
}

export function getWorkspaceFromParams(search: URLSearchParams): WorkspaceSelection | null {
  const department = search.get("department");
  const role = search.get("role");
  const section = search.get("section");

  const isDepartmentValid = departments.some((item) => item.code === department);
  const isRoleValid = roles.some((item) => item.code === role);
  const isSectionValid = !section || sections.some((item) => item.code === section);

  if (!department || !role || !isDepartmentValid || !isRoleValid || !isSectionValid) {
    return readWorkspaceSelection();
  }

  return {
    department: department as DepartmentCode,
    role: role as RoleCode,
    section: section as SectionCode | undefined,
  };
}
