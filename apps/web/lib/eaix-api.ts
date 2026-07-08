import type { DepartmentCode, RoleCode, SectionCode } from "@repo/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface AuthProfile {
  username: string;
  departmentCode: DepartmentCode;
  roleCode: RoleCode;
  permissions: string[];
}

export interface CreateContentPayload {
  title: string;
  departmentCode: DepartmentCode;
  sectionCode: SectionCode;
  fileName: string;
  fileSizeBytes: number;
  uploadedBy: string;
  extractedText?: string;
}

export interface ApiContentRecord {
  id: string;
  title: string;
  departmentCode: DepartmentCode;
  sectionCode: SectionCode;
  fileName: string;
  fileSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  version: number;
  summaryDraft?: string;
  summaryFinal?: string;
  summaryStatus?: "PENDING_OWNER_REVIEW" | "APPROVED";
  summaryApprovedBy?: string;
  summaryApprovedAt?: string;
}

export interface ApiContentSummary {
  ok: boolean;
  id: string;
  title: string;
  status: "PENDING_OWNER_REVIEW" | "APPROVED";
  summary: string;
  canOwnerFinalize: boolean;
  summaryAgent: string;
  summaryApprovedBy: string | null;
  summaryApprovedAt: string | null;
  summaryDraft: string;
  summaryFinal: string;
  uploadedBy: string;
}

export interface ApprovalQueueItem {
  contentId: string;
  title: string;
  requestedBy: string;
  departmentCode: DepartmentCode;
  status: "UNDER_REVIEW";
}

export interface OnboardUserPayload {
  username: string;
  departmentCode: DepartmentCode;
  roleCode: RoleCode;
  password: string;
}

export interface LoginPayload {
  username: string;
  roleCode: RoleCode;
  password: string;
}

export interface ApiUserProfile {
  username: string;
  departmentCode: DepartmentCode;
  roleCode: RoleCode;
  permissions: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorBody.message)) {
        errorMessage = errorBody.message.join(", ");
      } else if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Keep fallback message when response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function getActiveUsername() {
  if (typeof window === "undefined") {
    return "";
  }

  const raw = window.sessionStorage.getItem("eaix-active-user");
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username ?? "";
  } catch {
    return "";
  }
}

export function fetchAuthProfile() {
  if (typeof window !== "undefined") {
    const raw = window.sessionStorage.getItem("eaix-active-user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { username?: string };
        if (parsed.username) {
          return request<AuthProfile>(
            `/auth/profile?username=${encodeURIComponent(parsed.username)}`,
          );
        }
      } catch {
        // Fall back to default profile endpoint.
      }
    }
  }

  return request<AuthProfile>("/auth/profile");
}

export function login(payload: LoginPayload) {
  return request<{ ok: boolean; user: AuthProfile }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchUsers() {
  const actor = getActiveUsername();
  const path = actor
    ? `/auth/users?actor=${encodeURIComponent(actor)}`
    : "/auth/users";
  return request<ApiUserProfile[]>(path);
}

export function onboardUser(payload: OnboardUserPayload) {
  return request<{ ok: boolean; user: ApiUserProfile }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchContent() {
  return request<ApiContentRecord[]>("/content");
}

export function fetchMyContent(username: string) {
  return request<ApiContentRecord[]>(
    `/content/by-user/${encodeURIComponent(username)}`,
  );
}

export function createContent(payload: CreateContentPayload) {
  return request<ApiContentRecord>("/content", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteContent(id: string, actor: string) {
  return request<{ ok: boolean; reason?: string }>(
    `/content/${id}?actor=${encodeURIComponent(actor)}`,
    {
      method: "DELETE",
    },
  );
}

export function bumpVersion(id: string, editor: string) {
  return request<{ ok: boolean; reason?: string; record?: ApiContentRecord }>(
    `/content/${id}/edit`,
    {
      method: "PATCH",
      body: JSON.stringify({ editor }),
    },
  );
}

export function getDocumentViewUrl(id: string) {
  return `${API_BASE_URL}/content/${id}/view`;
}

export function getDocumentDownloadUrl(id: string) {
  return `${API_BASE_URL}/content/${id}/download`;
}

export function fetchDocumentSummary(id: string) {
  return request<ApiContentSummary>(`/content/${id}/summary`);
}

export function finalizeDocumentSummary(
  id: string,
  actor: string,
  summary: string,
) {
  return request<{ ok: boolean }>(`/content/${id}/summary/finalize`, {
    method: "PATCH",
    body: JSON.stringify({ actor, summary }),
  });
}

export function fetchReviewQueue() {
  return request<ApprovalQueueItem[]>("/approvals/queue");
}

export function approveContent(contentId: string, approver: string) {
  return request<{ decision: string; ok?: boolean; reason?: string }>(
    `/approvals/${contentId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ approver }),
    },
  );
}

export function rejectContent(
  contentId: string,
  approver: string,
  comments: string,
) {
  return request<{ decision: string; ok?: boolean; reason?: string }>(
    `/approvals/${contentId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ approver, comments }),
    },
  );
}
