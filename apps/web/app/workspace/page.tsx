"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { departments } from "@repo/types";
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bumpVersion,
  fetchDocumentSummary,
  fetchAuthProfile,
  fetchContent,
  finalizeDocumentSummary,
  getDocumentDownloadUrl,
  type ApiContentSummary,
  type ApiContentRecord,
} from "../../lib/eaix-api";
import {
  buildWorkspaceQuery,
  getWorkspaceFromParams,
} from "../../lib/workspace";
import { WorkspaceShell } from "../../components/workspace-shell";
import { DocumentPreviewModal } from "../../components/document-preview-modal";
import { DocumentEditModal } from "../../components/document-edit-modal";
import { DocumentSummaryModal } from "../../components/document-summary-modal";
import { toast } from "sonner";
import { canEditDocument } from "../../lib/access";

function WorkspacePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);
  const [content, setContent] = useState<ApiContentRecord[]>([]);
  const [actor, setActor] = useState("demo.user");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<ApiContentSummary | null>(
    null,
  );

  useEffect(() => {
    if (!selection) {
      return;
    }

    fetchContent()
      .then((records) => setContent(records))
      .catch(() => toast.error("Failed to load workspace content."));

    fetchAuthProfile()
      .then((profile) => setActor(profile.username))
      .catch(() => setActor("demo.user"));
  }, [selection]);

  const refresh = () => {
    fetchContent()
      .then((records) => setContent(records))
      .catch(() => toast.error("Failed to load workspace content."));
  };

  const viewDocumentPreview = async (id: string) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/content/${id}/view`);
      if (!response.ok) {
        toast.error("Failed to load document preview.");
        return;
      }
      const data = await response.json();
      setPreviewData(data);
      setPreviewModalOpen(true);
    } catch (error) {
      toast.error("Failed to load document preview.");
      console.error(error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const editDocument = async (id: string) => {
    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/content/${id}/view`);
      if (!response.ok) {
        toast.error("Failed to load document for editing.");
        return;
      }
      const data = await response.json();
      setEditData(data);
      setEditModalOpen(true);
    } catch (error) {
      toast.error("Failed to load document for editing.");
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const saveDocumentChanges = async (content: string) => {
    if (!editData) return;

    try {
      // First bump the version
      const versionResult = await bumpVersion(editData.id, actor);
      if (!versionResult.ok) {
        toast.error(
          versionResult.reason ?? "Failed to update document version.",
        );
        return;
      }

      // Then save the content
      const response = await fetch(
        `http://localhost:3001/content/${editData.id}/edit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message ?? "Failed to save document.");
        return;
      }

      toast.success("Document saved successfully.");
      setEditModalOpen(false);
      setEditData(null);
      refresh();
    } catch (error) {
      toast.error("Failed to save document.");
      console.error(error);
    }
  };

  const openSummary = async (id: string) => {
    try {
      const summary = await fetchDocumentSummary(id);
      setSummaryData(summary);
      setSummaryModalOpen(true);
    } catch {
      toast.error("Failed to load summary.");
    }
  };

  const finalizeSummary = async (summary: string) => {
    if (!summaryData) {
      return;
    }

    try {
      await finalizeDocumentSummary(summaryData.id, actor, summary);
      toast.success("Summary finalized and approved.");
      const refreshed = await fetchDocumentSummary(summaryData.id);
      setSummaryData(refreshed);
      refresh();
    } catch {
      toast.error("Failed to finalize summary.");
    }
  };

  const filtered = useMemo(() => {
    if (!selection) {
      return [];
    }

    const lowered = searchText.trim().toLowerCase();

    return content.filter((record) => {
      const sectionPass =
        !selection.section || record.sectionCode === selection.section;
      const departmentPass =
        departmentFilter === "ALL" ||
        record.departmentCode === departmentFilter;
      const searchPass =
        lowered.length === 0 ||
        [
          record.title,
          record.fileName,
          record.uploadedBy,
          record.lastEditedBy ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(lowered);

      return sectionPass && departmentPass && searchPass;
    });
  }, [content, departmentFilter, searchText, selection]);

  if (!selection) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>
          No selection found. Please return home and choose your role.
        </Typography>
        <Typography
          sx={{ color: "#16c6b0", cursor: "pointer", mt: 1 }}
          onClick={() => router.push("/")}
        >
          Go to home
        </Typography>
      </Box>
    );
  }

  return (
    <WorkspaceShell
      title={`${selection.section ?? "All Sections"} Workspace`}
      subtitle="Global section view. Add optional department filter and search only when needed."
      department={selection.department}
      role={selection.role}
      activeTab={selection.section ?? "TECHNICAL"}
    >
      <Paper
        sx={{ p: 2, borderRadius: 3, background: "rgba(11, 22, 31, 0.9)" }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <FormControl fullWidth>
            <InputLabel id="workspace-department-filter">
              Department Filter
            </InputLabel>
            <Select
              label="Department Filter"
              labelId="workspace-department-filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <MenuItem value="ALL">All Departments</MenuItem>
              {departments.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Search files, title, users"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </Stack>
      </Paper>

      <Paper
        sx={{ p: 2, borderRadius: 3, background: "rgba(11, 22, 31, 0.9)" }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <Button
            variant="contained"
            sx={{ borderRadius: 999 }}
            onClick={() => {
              const query = buildWorkspaceQuery({
                department: selection.department,
                role: selection.role,
              });
              router.push(`/workspace/upload?${query}`);
            }}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            sx={{ borderRadius: 999 }}
            onClick={() => {
              const query = buildWorkspaceQuery({
                department: selection.department,
                role: selection.role,
              });
              router.push(`/workspace/upload?${query}#my-uploads`);
            }}
          >
            My Uploads
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1.3}>
        <Typography variant="h6">Content List</Typography>
        {filtered.length === 0 ? (
          <Typography sx={{ color: "rgba(192,208,219,0.8)" }}>
            No content available for current filters.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {filtered.map((item) => (
              <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(11, 22, 31, 0.85)",
                  }}
                >
                  <Stack spacing={1.2}>
                    <Box>
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Typography sx={{ color: "rgba(196,211,220,0.8)" }}>
                        {item.fileName} |{" "}
                        {Math.round(item.fileSizeBytes / 1024)} KB
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(166,195,205,0.86)" }}
                      >
                        Uploaded by {item.uploadedBy} | Last edited by{" "}
                        {item.lastEditedBy ?? "-"}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip size="small" label={item.departmentCode} />
                      <Chip size="small" label={item.sectionCode} />
                      <Chip
                        size="small"
                        label={item.status}
                        color={
                          item.status === "APPROVED" ? "success" : "warning"
                        }
                      />
                      <Chip size="small" label={`v${item.version}`} />
                    </Stack>

                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => viewDocumentPreview(item.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={getDocumentDownloadUrl(item.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openSummary(item.id)}
                      >
                        Summary
                      </Button>
                      {canEditDocument(
                        selection.role,
                        actor,
                        item.uploadedBy,
                      ) && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => editDocument(item.id)}
                        >
                          Edit
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <DocumentPreviewModal
        open={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewData(null);
        }}
        preview={previewData}
        loading={previewLoading}
      />

      <DocumentEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditData(null);
        }}
        onSave={saveDocumentChanges}
        document={editData}
        loading={editLoading}
      />

      <DocumentSummaryModal
        open={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false);
          setSummaryData(null);
        }}
        summary={summaryData}
        actor={actor}
        actorCanFinalize={Boolean(
          selection && summaryData && summaryData.uploadedBy === actor,
        )}
        onFinalize={finalizeSummary}
      />
    </WorkspaceShell>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 3 }}>Loading workspace...</Box>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
