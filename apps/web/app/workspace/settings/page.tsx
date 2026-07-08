"use client";

import { Suspense, useMemo } from "react";
import { departments, roles, sections } from "@repo/types";
import { Alert, Paper, Stack, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { getWorkspaceFromParams } from "../../../lib/workspace";
import { canViewSettings } from "../../../lib/access";
import { WorkspaceShell } from "../../../components/workspace-shell";

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const editable = useMemo(
    () => !!selection?.role && canViewSettings(selection.role),
    [selection?.role],
  );

  if (!selection) {
    return null;
  }

  if (!editable) {
    return (
      <WorkspaceShell
        title="Masters Settings"
        subtitle="Access is restricted based on role policy."
        department={selection.department}
        role={selection.role}
        activeTab="UPLOAD"
      >
        <Alert severity="info">
          Master settings are visible only for Super User, Department Head, and Vice President.
        </Alert>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Masters Settings"
      subtitle="Department and role mapping controls for enterprise governance."
      department={selection.department}
      role={selection.role}
      activeTab="SETTINGS"
    >
      <Alert severity="success">
        You have elevated access. Editing actions can be enabled in the next backend iteration.
      </Alert>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper sx={{ p: 2, borderRadius: 3, flex: 1, background: "rgba(11,22,31,0.86)" }}>
          <Typography variant="h6">Departments</Typography>
          <Typography sx={{ color: "rgba(196,212,221,0.86)", mt: 1 }}>
            {departments.map((item) => item.label).join(" | ")}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3, flex: 1, background: "rgba(11,22,31,0.86)" }}>
          <Typography variant="h6">Roles</Typography>
          <Typography sx={{ color: "rgba(196,212,221,0.86)", mt: 1 }}>
            {roles.map((item) => item.label).join(" | ")}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3, flex: 1, background: "rgba(11,22,31,0.86)" }}>
          <Typography variant="h6">Sections</Typography>
          <Typography sx={{ color: "rgba(196,212,221,0.86)", mt: 1 }}>
            {sections.map((item) => item.label).join(" | ")}
          </Typography>
        </Paper>
      </Stack>
    </WorkspaceShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Typography sx={{ p: 3 }}>Loading settings...</Typography>}>
      <SettingsPageContent />
    </Suspense>
  );
}
