"use client";

import { useState, type SyntheticEvent } from "react";
import type { DepartmentCode, RoleCode } from "@repo/types";
import {
  AppBar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  LayoutDashboard,
  FileText,
  Upload,
  ClipboardCheck,
  History,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  canManageUsers,
  canViewReview,
  canViewSettings,
  canViewVersions,
} from "../lib/access";
import { buildWorkspaceQuery } from "../lib/workspace";

export type DashboardNavTab =
  | "DASHBOARD"
  | "TECHNICAL"
  | "NON_TECHNICAL"
  | "SME"
  | "UPLOAD"
  | "REVIEW"
  | "VERSIONS"
  | "SETTINGS"
  | "USERS";

interface DashboardTopNavProps {
  department: DepartmentCode;
  role: RoleCode;
  activeTab: DashboardNavTab;
}

export function DashboardTopNav({
  department,
  role,
  activeTab,
}: DashboardTopNavProps) {
  const router = useRouter();
  const query = buildWorkspaceQuery({ department, role });
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

  const userMenuOpen = Boolean(userAnchorEl);

  const handleTabChange = (_: SyntheticEvent, value: DashboardNavTab) => {
    switch (value) {
      case "DASHBOARD":
        router.push(`/dashboard?${query}`);
        break;
      case "TECHNICAL":
        router.push(`/workspace?${buildWorkspaceQuery({ department, role, section: "TECHNICAL" })}`);
        break;
      case "NON_TECHNICAL":
        router.push(`/workspace?${buildWorkspaceQuery({ department, role, section: "NON_TECHNICAL" })}`);
        break;
      case "SME":
        router.push(`/workspace?${buildWorkspaceQuery({ department, role, section: "SME" })}`);
        break;
      case "UPLOAD":
        router.push(`/workspace/upload?${query}`);
        break;
      case "REVIEW":
        router.push(`/workspace/review?${query}`);
        break;
      case "VERSIONS":
        router.push(`/workspace/versions?${query}`);
        break;
      case "SETTINGS":
        router.push(`/workspace/settings?${query}`);
        break;
      case "USERS":
        router.push(`/workspace/users?${query}`);
        break;
    }
  };

  const tabSx = {
    textTransform: "none",
    fontSize: "0.8rem",
    minHeight: 48,
    px: 1.5,
    gap: 0.6,
    "& .MuiTab-iconWrapper": { marginBottom: 0 },
  };

  const openUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
  };

  const closeUserMenu = () => {
    setUserAnchorEl(null);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "linear-gradient(90deg, #0b161f 0%, #0d1e2d 100%)",
        borderBottom: "1px solid rgba(22,200,200,0.18)",
        zIndex: 1200,
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 1.5, md: 3 },
          minHeight: "52px !important",
          gap: 2,
          flexWrap: "nowrap",
        }}
      >
        {/* Brand */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            flexShrink: 0,
          }}
          onClick={() => router.push(`/dashboard?${query}`)}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "6px",
              background: "linear-gradient(135deg, #16c6b0 0%, #0d8c7e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LayoutDashboard size={16} color="#0b161f" />
          </Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "#e8f0f5",
              letterSpacing: "0.02em",
              userSelect: "none",
            }}
          >
            EAIX
            <Typography
              component="span"
              sx={{
                fontWeight: 400,
                fontSize: "0.85rem",
                color: "rgba(166,195,205,0.75)",
                ml: 0.5,
              }}
            >
              Process
            </Typography>
          </Typography>
        </Box>

        {/* Navigation tabs - right aligned */}
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 52,
              maxWidth: "100%",
              "& .MuiTabs-indicator": {
                backgroundColor: "#16c6b0",
                height: 2,
              },
              "& .MuiTabs-flexContainer": {
                justifyContent: "flex-end",
              },
              "& .MuiTab-root": {
                color: "rgba(166,195,205,0.75)",
                "&.Mui-selected": { color: "#16c6b0" },
              },
            }}
          >
            <Tab
              icon={<LayoutDashboard size={14} />}
              iconPosition="start"
              label="Dashboard"
              value="DASHBOARD"
              sx={tabSx}
            />
            <Tab
              icon={<FileText size={14} />}
              iconPosition="start"
              label="Technical"
              value="TECHNICAL"
              sx={tabSx}
            />
            <Tab
              icon={<FileText size={14} />}
              iconPosition="start"
              label="Non-Technical"
              value="NON_TECHNICAL"
              sx={tabSx}
            />
            <Tab
              icon={<FileText size={14} />}
              iconPosition="start"
              label="SME"
              value="SME"
              sx={tabSx}
            />
            <Tab
              icon={<Upload size={14} />}
              iconPosition="start"
              label="Upload"
              value="UPLOAD"
              sx={tabSx}
            />
            {canViewReview(role) && (
              <Tab
                icon={<ClipboardCheck size={14} />}
                iconPosition="start"
                label="Review"
                value="REVIEW"
                sx={tabSx}
              />
            )}
            {canViewVersions(role) && (
              <Tab
                icon={<History size={14} />}
                iconPosition="start"
                label="Versions"
                value="VERSIONS"
                sx={tabSx}
              />
            )}
            {canViewSettings(role) && (
              <Tab
                icon={<Settings size={14} />}
                iconPosition="start"
                label="Settings"
                value="SETTINGS"
                sx={tabSx}
              />
            )}
            {canManageUsers(role) && (
              <Tab
                icon={<Users size={14} />}
                iconPosition="start"
                label="Users"
                value="USERS"
                sx={tabSx}
              />
            )}
          </Tabs>
        </Box>

        {/* User details menu */}
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Tooltip title="User details">
            <IconButton
              onClick={openUserMenu}
              size="small"
              sx={{
                border: "1px solid rgba(166,195,205,0.2)",
                background: "rgba(166,195,205,0.08)",
                color: "rgba(205,220,229,0.9)",
                "&:hover": {
                  background: "rgba(22,200,200,0.12)",
                  color: "#16c6b0",
                },
              }}
            >
              <UserRound size={15} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={userAnchorEl}
            open={userMenuOpen}
            onClose={closeUserMenu}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 210,
                background: "linear-gradient(180deg, #0f1c28 0%, #0c1722 100%)",
                border: "1px solid rgba(22,200,200,0.2)",
                color: "#e8f0f5",
              },
            }}
          >
            <MenuItem disabled sx={{ opacity: 1 }}>
              <ListItemText
                primary="User Details"
                secondary="Department and role context"
                primaryTypographyProps={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#16c6b0",
                }}
                secondaryTypographyProps={{
                  fontSize: "0.68rem",
                  color: "rgba(166,195,205,0.7)",
                }}
              />
            </MenuItem>
            <Divider sx={{ borderColor: "rgba(22,200,200,0.15)" }} />
            <MenuItem disabled sx={{ opacity: 1 }}>
              <ListItemText
                primary="Department"
                secondary={department}
                primaryTypographyProps={{
                  fontSize: "0.72rem",
                  color: "rgba(166,195,205,0.8)",
                }}
                secondaryTypographyProps={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#e8f0f5",
                }}
              />
            </MenuItem>
            <MenuItem disabled sx={{ opacity: 1 }}>
              <ListItemText
                primary="Role"
                secondary={role.replace(/_/g, " ")}
                primaryTypographyProps={{
                  fontSize: "0.72rem",
                  color: "rgba(166,195,205,0.8)",
                }}
                secondaryTypographyProps={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#e8f0f5",
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
