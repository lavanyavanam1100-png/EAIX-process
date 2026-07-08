"use client";

import { Suspense, useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import {
  bumpVersion,
  fetchAuthProfile,
  fetchContent,
  getDocumentDownloadUrl,
  getDocumentViewUrl,
  type ApiContentRecord,
} from "../../../lib/eaix-api";
import { getWorkspaceFromParams } from "../../../lib/workspace";
import { canEditDocument, canViewVersions } from "../../../lib/access";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { toast } from "sonner";

function VersionsPageContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const [actor, setActor] = useState("demo.user");
  const [records, setRecords] = useState<ApiContentRecord[]>([]);

  const load = () => {
    fetchContent()
      .then((items) => setRecords(items))
      .catch(() => toast.error("Unable to load version history."));
  };

  useEffect(() => {
    load();
    fetchAuthProfile()
      .then((profile) => setActor(profile.username))
      .catch(() => setActor("demo.user"));
  }, []);

  if (!selection) {
    return null;
  }

  const scoped = records.filter((item) => item.status === "APPROVED");

  const upgrade = async (id: string) => {
    const result = await bumpVersion(id, actor);
    if (!result.ok) {
      toast.error(result.reason ?? "Cannot update version.");
      return;
    }

    toast.success("New version published.");
    load();
  };

  if (!canViewVersions(selection.role)) {
    return (
      <WorkspaceShell
        title="Version History"
        subtitle="Access is restricted based on role policy."
        department={selection.department}
        role={selection.role}
        activeTab="UPLOAD"
      >
        <Typography sx={{ color: "rgba(193,209,220,0.8)" }}>
          Version history is visible only for Lead, Department Head, and Super User.
        </Typography>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Version History"
      subtitle="All approved documents can be improved with full traceability."
      department={selection.department}
      role={selection.role}
      activeTab="VERSIONS"
    >
      <Stack spacing={1.2}>
        {scoped.length === 0 ? (
          <Typography sx={{ color: "rgba(193,209,220,0.8)" }}>
            No approved records available for version upgrades.
          </Typography>
        ) : (
          scoped.map((item) => (
            <Paper key={item.id} sx={{ p: 2, borderRadius: 3, background: "rgba(11, 22, 31, 0.86)" }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
                <Box>
                  <Typography fontWeight={700}>{item.title}</Typography>
                  <Typography sx={{ color: "rgba(195,211,220,0.85)" }}>
                    Uploaded by {item.uploadedBy} | Last edited by {item.lastEditedBy ?? "-"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(169,193,203,0.9)" }}>
                    {item.fileName} | {Math.round(item.fileSizeBytes / 1024)} KB
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} alignItems="center">
                  <Chip label={`v${item.version}`} size="small" />
                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={getDocumentViewUrl(item.id)}
                    target="_blank"
                    rel="noreferrer"
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
                  {canEditDocument(selection.role, actor, item.uploadedBy) && (
                    <Button variant="contained" onClick={() => upgrade(item.id)}>
                      Edit
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </WorkspaceShell>
  );
}

export default function VersionsPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 3 }}>Loading version history...</Box>}>
      <VersionsPageContent />
    </Suspense>
  );
}
