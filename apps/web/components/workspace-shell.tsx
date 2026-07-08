"use client";

import type { ReactNode } from "react";
import type { DepartmentCode, RoleCode, SectionCode } from "@repo/types";
import { Box, Container, Stack, Typography } from "@mui/material";
import {
  DashboardTopNav,
  type DashboardNavTab,
} from "./dashboard-top-nav";

export type WorkspaceTab =
  | SectionCode
  | "UPLOAD"
  | "REVIEW"
  | "VERSIONS"
  | "SETTINGS"
  | "USERS";

interface WorkspaceShellProps {
  title: string;
  subtitle: string;
  department: DepartmentCode;
  role: RoleCode;
  activeTab: WorkspaceTab;
  children: ReactNode;
}

export function WorkspaceShell({
  title,
  subtitle,
  department,
  role,
  activeTab,
  children,
}: WorkspaceShellProps) {
  const navTab = activeTab as DashboardNavTab;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <DashboardTopNav
        department={department}
        role={role}
        activeTab={navTab}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.6}>
            <Typography variant="h4">{title}</Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.82)" }}>{subtitle}</Typography>
            <Typography variant="caption" sx={{ color: "#16c6b0" }}>
              Context Department: {department} | Role: {role}
            </Typography>
          </Stack>

          {children}
        </Stack>
      </Container>
    </Box>
  );
}
