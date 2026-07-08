"use client";

import { Suspense, useEffect, useState } from "react";
import { departments } from "@repo/types";
import {
  Alert,
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { canManageUsers } from "../../../lib/access";
import {
  fetchAuthProfile,
  fetchUsers,
  type ApiUserProfile,
  type AuthProfile,
} from "../../../lib/eaix-api";
import { getWorkspaceFromParams } from "../../../lib/workspace";

function UsersPageContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const [users, setUsers] = useState<ApiUserProfile[]>([]);
  const [actorRole, setActorRole] = useState("DEVELOPER");

  const loadUsers = () => {
    fetchUsers()
      .then((records) => setUsers(records))
      .catch(() => toast.error("Failed to load users."));
  };

  useEffect(() => {
    if (selection) {
      fetchAuthProfile()
        .then((profile: AuthProfile) => setActorRole(profile.roleCode))
        .catch(() => setActorRole("DEVELOPER"));
      loadUsers();
    }
  }, [selection]);

  if (!selection) {
    return null;
  }

  if (!canManageUsers(actorRole as any)) {
    return (
      <WorkspaceShell
        title="User Onboarding"
        subtitle="Access is restricted based on role policy."
        department={selection.department}
        role={selection.role}
        activeTab="UPLOAD"
      >
        <Alert severity="info">
          User management is available only for Admin users.
        </Alert>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Users"
      subtitle="Admin-only view of application users and their assigned details."
      department={selection.department}
      role={selection.role}
      activeTab="USERS"
    >
      <Stack spacing={1.2}>
        <Typography variant="h6">Registered Application Users</Typography>
        {users.length === 0 ? (
          <Typography sx={{ color: "rgba(195,211,220,0.85)" }}>No users found.</Typography>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 3,
              background: "rgba(11,22,31,0.86)",
              border: "1px solid rgba(22,200,200,0.18)",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#16c6b0", fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ color: "#16c6b0", fontWeight: 700 }}>Department</TableCell>
                  <TableCell sx={{ color: "#16c6b0", fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ color: "#16c6b0", fontWeight: 700 }}>Permissions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.username}>
                    <TableCell sx={{ color: "rgba(233,244,250,0.9)" }}>{item.username}</TableCell>
                    <TableCell sx={{ color: "rgba(195,211,220,0.85)" }}>{item.departmentCode}</TableCell>
                    <TableCell sx={{ color: "rgba(195,211,220,0.85)" }}>{item.roleCode}</TableCell>
                    <TableCell sx={{ color: "rgba(195,211,220,0.75)", fontSize: "0.78rem" }}>
                      {(item.permissions || []).join(", ") || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </WorkspaceShell>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 3 }}>Loading user onboarding...</Box>}>
      <UsersPageContent />
    </Suspense>
  );
}
