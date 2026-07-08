"use client";

import { Suspense, useEffect, useState } from "react";
import { sections } from "@repo/types";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  LinearProgress,
  Chip,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Upload, FileText, Trash2, X } from "lucide-react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  createContent,
  deleteContent,
  fetchDocumentSummary,
  fetchAuthProfile,
  fetchContent,
  fetchMyContent,
  finalizeDocumentSummary,
  type ApiContentSummary,
  type ApiContentRecord,
} from "../../../lib/eaix-api";
import { getWorkspaceFromParams } from "../../../lib/workspace";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { toast } from "sonner";
import { DocumentSummaryModal } from "../../../components/document-summary-modal";

interface FileToUpload {
  id: string;
  file: File;
  title: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} at ${hours}:${minutes}`;
}

function UploadPageContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const [records, setRecords] = useState<ApiContentRecord[]>([]);
  const [myUploads, setMyUploads] = useState<ApiContentRecord[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileToUpload[]>([]);
  const [section, setSection] =
    useState<(typeof sections)[number]["code"]>("TECHNICAL");
  const [actor, setActor] = useState("demo.user");
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<ApiContentSummary | null>(
    null,
  );

  const allowedExtensions = [
    "img",
    "png",
    "jpeg",
    "jpg",
    "pdf",
    "xls",
    "xlsx",
    "csv",
    "doc",
    "docx",
    "txt",
    "json",
    "zip",
  ];

  const acceptValue =
    ".img,.png,.jpeg,.jpg,.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,.json,.zip";

  const load = (username: string) => {
    fetchContent()
      .then((data) => setRecords(data))
      .catch(() => toast.error("Unable to load uploaded records."));

    fetchMyContent(username)
      .then((data) => setMyUploads(data))
      .catch(() => toast.error("Unable to load your uploaded documents."));
  };

  useEffect(() => {
    fetchAuthProfile()
      .then((profile) => {
        setActor(profile.username);
        load(profile.username);
      })
      .catch(() => {
        setActor("demo.user");
        load("demo.user");
      });
    setMounted(true);
  }, []);

  if (!selection) {
    return null;
  }

  const extractZipFiles = async (zipFile: File): Promise<File[]> => {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);
      const files: File[] = [];

      for (const [filename, fileData] of Object.entries(contents.files)) {
        if (!fileData.dir) {
          const extension = filename.split(".").pop()?.toLowerCase() ?? "";
          if (allowedExtensions.includes(extension) && extension !== "zip") {
            const blob = await fileData.async("blob");
            files.push(
              new File([blob], filename, {
                type: fileData.dir ? "application/octet-stream" : "",
              }),
            );
          }
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${(error as Error).message}`);
    }
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    const newFilesToUpload: FileToUpload[] = [];

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (!allowedExtensions.includes(extension)) {
        toast.error(`Unsupported file: ${file.name}`);
        continue;
      }

      if (extension === "zip") {
        try {
          const extractedFiles = await extractZipFiles(file);
          if (extractedFiles.length === 0) {
            toast.error(`No valid files found in ${file.name}`);
            continue;
          }

          extractedFiles.forEach((extractedFile) => {
            newFilesToUpload.push({
              id: `${Date.now()}-${Math.random()}`,
              file: extractedFile,
              title: extractedFile.name.replace(/\.[^/.]+$/, ""),
              status: "pending",
            });
          });

          toast.success(
            `Extracted ${extractedFiles.length} file(s) from ${file.name}`,
          );
        } catch (error) {
          toast.error(`Failed to extract ZIP: ${(error as Error).message}`);
        }
      } else {
        newFilesToUpload.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          status: "pending",
        });
      }
    }

    setSelectedFiles((prev) => [...prev, ...newFilesToUpload]);
    event.target.value = "";
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const buildExtractedText = async (file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    try {
      // Plain text formats — read directly
      if (extension === "txt" || extension === "csv" || extension === "json") {
        const text = await file.text();
        return text.slice(0, 4000);
      }

      // Excel — parse sheet rows
      if (extension === "xlsx" || extension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const parts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
          if (rows.length > 0) {
            parts.push(`__SHEET__${sheetName}`);
            parts.push(JSON.stringify(rows.slice(0, 250)));
          }
        }
        return parts.join("\n");
      }

      // PDF — extract text page by page via pdfjs-dist
      if (extension === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pageTexts: string[] = [];
        const pagesToRead = Math.min(pdf.numPages, 15);
        for (let i = 1; i <= pagesToRead; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items
            .map((item: unknown) => (typeof item === "object" && item !== null && "str" in item ? (item as { str: string }).str : ""))
            .join(" ")
            .trim();
          if (text) pageTexts.push(`[Page ${i}] ${text}`);
        }
        const combined = pageTexts.join("\n");
        return `__PDF__pages=${pdf.numPages}\n${combined.slice(0, 4000)}`;
      }

      // DOCX — extract raw text via mammoth
      if (extension === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value.trim();
        return `__DOCX__\n${text.slice(0, 4000)}`;
      }

      // DOC — legacy binary Word format, read readable characters
      if (extension === "doc") {
        const text = await file.text();
        const readable = text
          .replace(/[\x00-\x1F\x7F-\xFF]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return readable.length > 80
          ? `__DOC__\n${readable.slice(0, 2000)}`
          : "";
      }

      // Images — capture format and size metadata for description
      if (["png", "jpg", "jpeg", "img"].includes(extension)) {
        return `__IMAGE__format=${extension.toUpperCase()},size=${Math.round(file.size / 1024)}KB,name=${file.name}`;
      }
    } catch {
      // Extraction failed — fall back to metadata-only summary
    }

    return "";
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("Please select files to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (fileToUpload) => {
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id
              ? { ...f, status: "uploading" as const }
              : f,
          ),
        );

        try {
          const extractedText = await buildExtractedText(fileToUpload.file);
          const created = await createContent({
            title: fileToUpload.title,
            fileName: fileToUpload.file.name,
            fileSizeBytes: fileToUpload.file.size,
            uploadedBy: actor,
            departmentCode: selection.department,
            sectionCode: section,
            extractedText,
          });

          if (created?.id) {
            const generated = await fetchDocumentSummary(created.id);
            setSummaryData(generated);
            setSummaryModalOpen(true);
            toast.info(
              "AI summary generated. Please review and finalize for other users.",
            );
          }

          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id
                ? { ...f, status: "success" as const }
                : f,
            ),
          );
        } catch (error) {
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id
                ? {
                    ...f,
                    status: "error" as const,
                    error: (error as Error).message,
                  }
                : f,
            ),
          );
        }
      });

      await Promise.all(uploadPromises);

      const successCount = selectedFiles.filter(
        (f) => f.status === "success",
      ).length;
      if (successCount > 0) {
        toast.success(`${successCount} file(s) submitted for review.`);
        setSelectedFiles([]);
        load(actor);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const deletable = records.filter(
    (item) => item.uploadedBy === actor && item.status !== "APPROVED",
  );

  const finalizeSummaryFromUpload = async (summary: string) => {
    if (!summaryData) {
      return;
    }

    await finalizeDocumentSummary(summaryData.id, actor, summary);
    const refreshed = await fetchDocumentSummary(summaryData.id);
    setSummaryData(refreshed);
    toast.success("Summary finalized.");
    load(actor);
  };

  return (
    <WorkspaceShell
      title="Upload Panel"
      subtitle="Upload single files, multiple files, or ZIP archives. Each file is saved separately."
      department={selection.department}
      role={selection.role}
      activeTab="UPLOAD"
    >
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          background:
            "linear-gradient(135deg, rgba(22,82,92,0.4) 0%, rgba(11,22,31,0.95) 100%)",
          border: "1px solid rgba(22,200,200,0.15)",
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: "#16c6b0",
                fontWeight: 600,
                mb: 0.8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.8rem",
              }}
            >
              Upload Documents
            </Typography>
          </Box>

          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload size={18} />}
              size="small"
              disabled={isUploading}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                borderColor: "rgba(22,200,200,0.4)",
                color: "#16c6b0",
                "&:hover": {
                  borderColor: "#16c6b0",
                  backgroundColor: "rgba(22,200,200,0.08)",
                },
              }}
            >
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : "Select Files"}
              <input
                hidden
                type="file"
                multiple
                accept={acceptValue}
                onChange={handleFileSelection}
                disabled={isUploading}
              />
            </Button>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.8,
                color: "rgba(166,195,205,0.7)",
                fontSize: "0.75rem",
              }}
            >
              Formats: img, png, jpeg, jpg, pdf, xls, xlsx, csv, doc, docx, txt,
              zip
            </Typography>
          </Box>

          {selectedFiles.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mb: 1,
                  color: "rgba(205,220,229,0.8)",
                  fontWeight: 500,
                }}
              >
                Selected Files ({selectedFiles.length})
              </Typography>
              <Stack spacing={0.8}>
                {selectedFiles.map((fileToUpload) => (
                  <Box
                    key={fileToUpload.id}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      background: "rgba(11, 22, 31, 0.5)",
                      border: "1px solid rgba(166,195,205,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={0.8}
                      sx={{ flex: 1 }}
                    >
                      <FileText size={14} style={{ color: "#16c6b0" }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            color: "rgba(205,220,229,0.9)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fileToUpload.file.name}
                        </Typography>
                        {fileToUpload.status === "uploading" && (
                          <LinearProgress
                            sx={{
                              height: 3,
                              borderRadius: 1,
                              mt: 0.4,
                              background: "rgba(22,200,200,0.2)",
                              "& .MuiLinearProgress-bar": {
                                background:
                                  "linear-gradient(90deg, #16c6b0 0%, #0fa89b 100%)",
                              },
                            }}
                          />
                        )}
                        {fileToUpload.status === "error" && (
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              color: "#f44336",
                              mt: 0.2,
                            }}
                          >
                            {fileToUpload.error}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    <Box
                      sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
                    >
                      {fileToUpload.status === "success" && (
                        <Chip
                          label="✓"
                          size="small"
                          sx={{
                            background: "rgba(76, 175, 80, 0.2)",
                            color: "#4CAF50",
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                      {fileToUpload.status === "error" && (
                        <Chip
                          label="✕"
                          size="small"
                          sx={{
                            background: "rgba(244, 67, 54, 0.2)",
                            color: "#f44336",
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                      {fileToUpload.status === "pending" && !isUploading && (
                        <Button
                          size="small"
                          onClick={() => removeFile(fileToUpload.id)}
                          aria-label="Remove file from upload queue"
                          sx={{
                            minWidth: 32,
                            padding: 0.5,
                            color: "rgba(166,195,205,0.75)",
                            "&:hover": { color: "rgba(205,220,229,0.95)" },
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <FormControl size="small">
            <InputLabel id="section-label" sx={{ fontSize: "0.9rem" }}>
              Section
            </InputLabel>
            <Select
              label="Section"
              labelId="section-label"
              value={section}
              onChange={(e) => setSection(e.target.value as typeof section)}
              disabled={isUploading}
              sx={{
                borderRadius: 1.5,
              }}
            >
              {sections.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
            <Button
              variant="contained"
              onClick={uploadFiles}
              disabled={selectedFiles.length === 0 || isUploading}
              size="small"
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                background: "linear-gradient(135deg, #16c6b0 0%, #0fa89b 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1dd4ba 0%, #16c6b0 100%)",
                },
                "&:disabled": {
                  background: "rgba(22,200,200,0.2)",
                  color: "rgba(166,195,205,0.5)",
                },
              }}
            >
              {isUploading
                ? `Uploading ${selectedFiles.filter((f) => f.status === "uploading").length}...`
                : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                const target = document.getElementById("my-uploads");
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={isUploading}
              size="small"
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                color: "rgba(166,195,205,0.8)",
                "&:hover": {
                  color: "#16c6b0",
                  backgroundColor: "rgba(22,200,200,0.08)",
                },
              }}
            >
              View My Uploads
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 1.5,
            fontWeight: 600,
            color: "rgba(205,220,229,0.95)",
            fontSize: "1rem",
          }}
        >
          Drafts & Under Review
        </Typography>
        <Stack spacing={1}>
          {deletable.length === 0 ? (
            <Typography
              sx={{ color: "rgba(166,195,205,0.7)", fontSize: "0.9rem" }}
            >
              No draft or under-review records that you can delete.
            </Typography>
          ) : (
            deletable.map((item) => (
              <Paper
                key={item.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  background: "rgba(11, 22, 31, 0.5)",
                  border: "1px solid rgba(166,195,205,0.1)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  gap={1}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600} sx={{ fontSize: "0.95rem" }}>
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(194,211,220,0.7)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {item.fileName} • {item.status}
                    </Typography>
                  </Box>
                  <Button
                    color="error"
                    variant="text"
                    size="small"
                    startIcon={<Trash2 size={16} />}
                    onClick={() =>
                      deleteContent(item.id, actor).then(() => load(actor))
                    }
                    sx={{
                      textTransform: "none",
                      fontSize: "0.85rem",
                    }}
                  >
                    Delete
                  </Button>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Box>

      <Box id="my-uploads" sx={{ mt: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 1.5,
            fontWeight: 600,
            color: "rgba(205,220,229,0.95)",
            fontSize: "1rem",
          }}
        >
          My Uploads
        </Typography>
        <Stack spacing={1}>
          {myUploads.length === 0 ? (
            <Typography
              sx={{ color: "rgba(166,195,205,0.7)", fontSize: "0.9rem" }}
            >
              You have not uploaded any documents yet.
            </Typography>
          ) : (
            myUploads.map((item) => (
              <Paper
                key={`mine-${item.id}`}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  background: "rgba(11, 22, 31, 0.5)",
                  border: "1px solid rgba(22,200,200,0.1)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "rgba(22,200,200,0.2)",
                    background: "rgba(11, 22, 31, 0.65)",
                  },
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  gap={1}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" gap={0.8}>
                      <FileText size={16} style={{ color: "#16c6b0" }} />
                      <Typography fontWeight={600} sx={{ fontSize: "0.95rem" }}>
                        {item.title}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        color: "rgba(194,211,220,0.7)",
                        fontSize: "0.85rem",
                        mt: 0.5,
                      }}
                    >
                      {item.fileName} • {item.status} • v{item.version}
                    </Typography>
                    {mounted && (
                      <Typography
                        sx={{
                          color: "rgba(166,195,205,0.6)",
                          fontSize: "0.8rem",
                          mt: 0.3,
                        }}
                      >
                        {formatDate(item.uploadedAt)}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Box>

      <DocumentSummaryModal
        open={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false);
          setSummaryData(null);
        }}
        summary={summaryData}
        actor={actor}
        actorCanFinalize={Boolean(
          summaryData && summaryData.uploadedBy === actor,
        )}
        onFinalize={finalizeSummaryFromUpload}
      />
    </WorkspaceShell>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 3 }}>Loading upload panel...</Box>}>
      <UploadPageContent />
    </Suspense>
  );
}
