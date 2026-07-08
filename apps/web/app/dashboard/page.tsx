"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Download,
  Eye,
  Pencil,
  Search,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  fetchAuthProfile,
  fetchContent,
  fetchDocumentSummary,
  finalizeDocumentSummary,
  getDocumentDownloadUrl,
  getDocumentViewUrl,
  type ApiContentRecord,
  type ApiContentSummary,
} from "../../lib/eaix-api";
import type { RoleCode } from "@repo/types";
import { getWorkspaceFromParams, buildWorkspaceQuery } from "../../lib/workspace";
import { canEditDocument } from "../../lib/access";
import { DashboardTopNav } from "../../components/dashboard-top-nav";
import { DocumentSummaryModal } from "../../components/document-summary-modal";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Approved", color: "#4caf50", bg: "rgba(76,175,80,0.12)" },
  UNDER_REVIEW: { label: "Under Review", color: "#ff9800", bg: "rgba(255,152,0,0.12)" },
  DRAFT: { label: "Draft", color: "#90a4ae", bg: "rgba(144,164,174,0.12)" },
  REJECTED: { label: "Rejected", color: "#f44336", bg: "rgba(244,67,54,0.12)" },
};

function statusChip(status: string) {
  const meta = statusMeta[status] ?? { label: status, color: "#90a4ae", bg: "rgba(144,164,174,0.12)" };
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.color}40`,
        fontSize: "0.7rem",
        height: 22,
        fontWeight: 600,
      }}
    />
  );
}

function sectionChip(section: string) {
  const labels: Record<string, string> = {
    TECHNICAL: "Technical",
    NON_TECHNICAL: "Non-Technical",
    SME: "SME",
  };
  return (
    <Chip
      label={labels[section] ?? section}
      size="small"
      sx={{
        background: "rgba(22,200,200,0.1)",
        color: "rgba(166,195,205,0.9)",
        border: "1px solid rgba(22,200,200,0.2)",
        fontSize: "0.68rem",
        height: 20,
      }}
    />
  );
}

function extBadge(fileName: string) {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "—";
  return (
    <Chip
      label={ext}
      size="small"
      sx={{
        background: "rgba(255,138,101,0.1)",
        color: "rgba(255,138,101,0.9)",
        border: "1px solid rgba(255,138,101,0.2)",
        fontSize: "0.62rem",
        height: 18,
        fontWeight: 700,
      }}
    />
  );
}

/** Strip newlines from multi-line summaries and truncate for single-line display */
function summarySnippet(text: string | undefined) {
  if (!text) return "";
  return text.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

type SortField = "title" | "uploadedBy" | "status" | "uploadedAt" | "version";
type SortDir = "asc" | "desc";

// ─── stats cards ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Paper
      sx={{
        p: 2,
        flex: 1,
        minWidth: 130,
        background: "rgba(13,27,38,0.9)",
        border: "1px solid rgba(22,200,200,0.15)",
        borderRadius: 2,
      }}
    >
      <Typography sx={{ fontSize: "0.7rem", color: "rgba(166,195,205,0.65)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.7rem", fontWeight: 700, color: "#16c6b0", lineHeight: 1 }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: "0.7rem", color: "rgba(166,195,205,0.55)", mt: 0.3 }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

function DashboardContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const [records, setRecords] = useState<ApiContentRecord[]>([]);
  const [actor, setActor] = useState("demo.user");
  const [actorRole, setActorRole] = useState<string>("DEVELOPER");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<ApiContentSummary | null>(null);

  useEffect(() => {
    Promise.all([
      fetchContent().catch(() => [] as ApiContentRecord[]),
      fetchAuthProfile().catch(() => null),
    ]).then(([docs, profile]) => {
      setRecords(docs);
      if (profile) {
        setActor(profile.username);
        setActorRole(profile.roleCode);
      }
      setLoading(false);
    });
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openSummary = async (id: string) => {
    try {
      const data = await fetchDocumentSummary(id);
      setSummaryData(data);
      setSummaryOpen(true);
    } catch {
      toast.error("Failed to load summary.");
    }
  };

  const handleFinalizeSummary = async (summary: string) => {
    if (!summaryData) return;
    try {
      await finalizeDocumentSummary(summaryData.id, actor, summary);
      toast.success("Summary finalized.");
      const refreshed = await fetchDocumentSummary(summaryData.id);
      setSummaryData(refreshed);
    } catch {
      toast.error("Failed to finalize summary.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? records.filter((r) =>
          [r.title, r.fileName, r.uploadedBy, r.departmentCode, r.sectionCode, r.status]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : records;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "uploadedBy") cmp = a.uploadedBy.localeCompare(b.uploadedBy);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else if (sortField === "version") cmp = a.version - b.version;
      else cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [records, search, sortField, sortDir]);

  // stats
  const totalDocs = records.length;
  const approved = records.filter((r) => r.status === "APPROVED").length;
  const underReview = records.filter((r) => r.status === "UNDER_REVIEW").length;
  const myDocs = records.filter((r) => r.uploadedBy === actor).length;

  if (!selection) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ color: "rgba(166,195,205,0.8)" }}>
          No user session found.{" "}
          <Typography
            component="span"
            sx={{ color: "#16c6b0", cursor: "pointer" }}
            onClick={() => (window.location.href = "/")}
          >
            Go to login →
          </Typography>
        </Typography>
      </Box>
    );
  }

  const thSx = {
    color: "#16c6b0",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    background: "rgba(22,82,92,0.35)",
    borderBottom: "1px solid rgba(22,200,200,0.2)",
    whiteSpace: "nowrap" as const,
    py: 1.2,
  };

  const tdSx = {
    color: "rgba(232,240,245,0.9)",
    fontSize: "0.8rem",
    borderBottom: "1px solid rgba(22,200,200,0.07)",
    py: 1,
    verticalAlign: "middle" as const,
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#081219" }}>
      <DashboardTopNav
        department={selection.department}
        role={actorRole as RoleCode}
        activeTab="DASHBOARD"
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Page heading */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#e8f0f5" }}>
                Document Dashboard
              </Typography>
              <Typography sx={{ color: "rgba(166,195,205,0.7)", fontSize: "0.85rem", mt: 0.3 }}>
                Central view of all uploaded documents across departments and sections.
              </Typography>
            </Box>
          </Stack>

          {/* Stats row */}
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <StatCard label="Total Documents" value={totalDocs} />
            <StatCard label="Approved" value={approved} sub={`${totalDocs > 0 ? Math.round((approved / totalDocs) * 100) : 0}% of total`} />
            <StatCard label="Under Review" value={underReview} />
            <StatCard label="My Uploads" value={myDocs} sub={`as ${actor}`} />
          </Stack>

          {/* Table card */}
          <Paper
            sx={{
              background: "rgba(13,27,38,0.95)",
              border: "1px solid rgba(22,200,200,0.15)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Toolbar */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1.2}
              sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(22,200,200,0.12)" }}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                <SlidersHorizontal size={15} color="#16c6b0" />
                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#e8f0f5" }}>
                  All Documents
                </Typography>
                <Chip
                  label={filtered.length}
                  size="small"
                  sx={{ background: "rgba(22,200,200,0.15)", color: "#16c6b0", fontSize: "0.68rem", height: 18 }}
                />
              </Stack>
              <TextField
                size="small"
                placeholder="Search by name, owner, status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={14} color="rgba(166,195,205,0.6)" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 280,
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.8rem",
                    borderRadius: 1.5,
                    "& fieldset": { borderColor: "rgba(22,200,200,0.25)" },
                    "&:hover fieldset": { borderColor: "rgba(22,200,200,0.45)" },
                    "&.Mui-focused fieldset": { borderColor: "#16c6b0" },
                  },
                }}
              />
            </Stack>

            {/* Table */}
            <TableContainer sx={{ maxHeight: "calc(100vh - 340px)", overflowX: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={28} sx={{ color: "#16c6b0" }} />
                </Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <FileText size={32} color="rgba(166,195,205,0.3)" />
                  <Typography sx={{ mt: 1.5, color: "rgba(166,195,205,0.5)", fontSize: "0.85rem" }}>
                    {search ? "No documents match your search." : "No documents uploaded yet."}
                  </Typography>
                </Box>
              ) : (
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...thSx, minWidth: 200 }}>
                        <TableSortLabel
                          active={sortField === "title"}
                          direction={sortField === "title" ? sortDir : "asc"}
                          onClick={() => handleSort("title")}
                          sx={{ color: "inherit !important", "& .MuiTableSortLabel-icon": { color: "#16c6b0 !important" } }}
                        >
                          Document
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 110 }}>
                        <TableSortLabel
                          active={sortField === "uploadedBy"}
                          direction={sortField === "uploadedBy" ? sortDir : "asc"}
                          onClick={() => handleSort("uploadedBy")}
                          sx={{ color: "inherit !important", "& .MuiTableSortLabel-icon": { color: "#16c6b0 !important" } }}
                        >
                          Owner
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 90 }}>Dept</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 110 }}>Section</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 280 }}>Summary</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 110 }}>
                        <TableSortLabel
                          active={sortField === "status"}
                          direction={sortField === "status" ? sortDir : "asc"}
                          onClick={() => handleSort("status")}
                          sx={{ color: "inherit !important", "& .MuiTableSortLabel-icon": { color: "#16c6b0 !important" } }}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 60 }}>
                        <TableSortLabel
                          active={sortField === "version"}
                          direction={sortField === "version" ? sortDir : "asc"}
                          onClick={() => handleSort("version")}
                          sx={{ color: "inherit !important", "& .MuiTableSortLabel-icon": { color: "#16c6b0 !important" } }}
                        >
                          Ver.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 80 }}>Size</TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 100 }}>
                        <TableSortLabel
                          active={sortField === "uploadedAt"}
                          direction={sortField === "uploadedAt" ? sortDir : "asc"}
                          onClick={() => handleSort("uploadedAt")}
                          sx={{ color: "inherit !important", "& .MuiTableSortLabel-icon": { color: "#16c6b0 !important" } }}
                        >
                          Uploaded
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...thSx, minWidth: 110, textAlign: "center" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((row) => {
                      const canEdit = canEditDocument(
                        actorRole as any,
                        actor,
                        row.uploadedBy,
                      );
                      const rawSummary =
                        row.summaryStatus === "APPROVED"
                          ? row.summaryFinal
                          : row.summaryDraft;
                      const snippet = summarySnippet(rawSummary);

                      return (
                        <TableRow
                          key={row.id}
                          sx={{
                            "&:hover": { background: "rgba(22,200,200,0.04)" },
                            transition: "background 0.15s",
                          }}
                        >
                          {/* Document */}
                          <TableCell sx={tdSx}>
                            <Stack direction="row" alignItems="center" gap={0.8}>
                              {extBadge(row.fileName)}
                              <Box>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#e8f0f5" }}>
                                  {row.title}
                                </Typography>
                                <Typography sx={{ fontSize: "0.68rem", color: "rgba(166,195,205,0.55)" }}>
                                  {row.fileName}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* Owner */}
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.78rem", color: "rgba(205,220,229,0.85)" }}>
                              {row.uploadedBy}
                            </Typography>
                          </TableCell>

                          {/* Dept */}
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.75rem", color: "rgba(166,195,205,0.75)" }}>
                              {row.departmentCode}
                            </Typography>
                          </TableCell>

                          {/* Section */}
                          <TableCell sx={tdSx}>{sectionChip(row.sectionCode)}</TableCell>

                          {/* Summary */}
                          <TableCell sx={{ ...tdSx, maxWidth: 280 }}>
                            {snippet ? (
                              <Tooltip title="Click to read full summary" placement="top">
                                <Typography
                                  onClick={() => openSummary(row.id)}
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: "rgba(205,220,229,0.75)",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                    maxWidth: 280,
                                    "&:hover": { color: "#16c6b0", textDecoration: "underline" },
                                  }}
                                >
                                  {snippet}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography
                                onClick={() => openSummary(row.id)}
                                sx={{
                                  fontSize: "0.72rem",
                                  color: "rgba(166,195,205,0.4)",
                                  cursor: "pointer",
                                  fontStyle: "italic",
                                  "&:hover": { color: "#16c6b0" },
                                }}
                              >
                                No summary — click to generate
                              </Typography>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell sx={tdSx}>{statusChip(row.status)}</TableCell>

                          {/* Version */}
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.75rem", color: "rgba(166,195,205,0.7)" }}>
                              v{row.version}
                            </Typography>
                          </TableCell>

                          {/* Size */}
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(166,195,205,0.55)" }}>
                              {formatBytes(row.fileSizeBytes)}
                            </Typography>
                          </TableCell>

                          {/* Uploaded date */}
                          <TableCell sx={tdSx}>
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(166,195,205,0.6)" }}>
                              {formatDate(row.uploadedAt)}
                            </Typography>
                          </TableCell>

                          {/* Actions */}
                          <TableCell sx={{ ...tdSx, textAlign: "center" }}>
                            <Stack direction="row" justifyContent="center" gap={0.3}>
                              <Tooltip title="View document">
                                <IconButton
                                  size="small"
                                  href={getDocumentViewUrl(row.id)}
                                  target="_blank"
                                  sx={{ color: "rgba(166,195,205,0.7)", "&:hover": { color: "#16c6b0" } }}
                                >
                                  <Eye size={15} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Download document">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={getDocumentDownloadUrl(row.id)}
                                  download
                                  sx={{ color: "rgba(166,195,205,0.7)", "&:hover": { color: "#16c6b0" } }}
                                >
                                  <Download size={15} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip
                                title={
                                  canEdit
                                    ? "Edit document"
                                    : "Only the document owner can edit this file"
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={!canEdit}
                                    onClick={() => {
                                      if (canEdit)
                                        window.location.href = `/workspace?${buildWorkspaceQuery({ department: row.departmentCode, role: actorRole as any })}`;
                                    }}
                                    sx={{
                                      color: canEdit
                                        ? "rgba(166,195,205,0.7)"
                                        : "rgba(166,195,205,0.2)",
                                      "&:hover": canEdit
                                        ? { color: "#16c6b0" }
                                        : {},
                                      cursor: canEdit ? "pointer" : "not-allowed",
                                    }}
                                  >
                                    <Pencil size={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <Box sx={{ px: 2, py: 1, borderTop: "1px solid rgba(22,200,200,0.1)" }}>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(166,195,205,0.45)" }}>
                  Showing {filtered.length} of {records.length} document(s) — click any summary to view full content
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>

      <DocumentSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summary={summaryData}
        actor={actor}
        actorCanFinalize={true}
        onFinalize={handleFinalizeSummary}
      />
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
