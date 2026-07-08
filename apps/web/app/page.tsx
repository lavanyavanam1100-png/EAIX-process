"use client";

import { useEffect, useState } from "react";
import { departments } from "@repo/types";
import {
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PulseSpinner } from "../components/pulse-spinner";
import {
  buildWorkspaceQuery,
  clearAuthSession,
  persistLoggedInUser,
  persistWorkspace,
  readWorkspaceSelection,
} from "../lib/workspace";
import { login, onboardUser } from "../lib/eaix-api";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("demo.user");
  const [department, setDepartment] = useState<"PSC" | "MFG">("PSC");
  const [role, setRole] = useState<
    "DEVELOPER" | "SME" | "LEAD" | "MANAGER" | "ADMIN"
  >("DEVELOPER");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = readWorkspaceSelection();
    if (existing) {
      router.replace(`/dashboard?${buildWorkspaceQuery(existing)}`);
    }
  }, [router]);

  const submitLogin = async () => {
    if (!username.trim() || !department || !role || !password.trim()) {
      toast.warning("Please fill username, department, role, and password.");
      return;
    }

    setBusy(true);
    try {
      const result = await login({
        username: username.trim().toLowerCase(),
        roleCode: role,
        password,
      });

      if (!result.ok) {
        toast.error("Invalid credentials.");
        setBusy(false);
        return;
      }

      persistLoggedInUser({
        username: result.user.username,
        departmentCode: result.user.departmentCode,
        roleCode: result.user.roleCode,
      });
      persistWorkspace({
        department: result.user.departmentCode,
        role: result.user.roleCode as any,
      });

      toast.success(`Welcome ${result.user.username}`);
      router.push(
        `/dashboard?${buildWorkspaceQuery({
          department: result.user.departmentCode,
          role: result.user.roleCode as any,
        })}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed. Please verify credentials.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = async () => {
    if (!username.trim() || !department || !role || !password.trim()) {
      toast.warning("Please fill username, department, role, and password.");
      return;
    }

    setBusy(true);
    try {
      await onboardUser({
        username: username.trim().toLowerCase(),
        departmentCode: department,
        roleCode: role,
        password,
      });
      toast.success("Signup successful. Please log in.");
      setMode("login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Signup failed. Please try again.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background:
          "radial-gradient(circle at 10% 10%, rgba(22,198,176,0.22), transparent 35%), radial-gradient(circle at 86% 12%, rgba(255,138,101,0.15), transparent 30%), #081219",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          sx={{
            p: 3,
            borderRadius: 3,
            background: "linear-gradient(180deg, rgba(11,22,31,0.96), rgba(10,18,27,0.96))",
            border: "1px solid rgba(22,200,200,0.2)",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: "0.78rem", color: "#16c6b0", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                EAIX Secure Access
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
                {mode === "login" ? "Login" : "New Signup"}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: "0.84rem", color: "rgba(166,195,205,0.75)" }}>
                {mode === "login"
                  ? "Enter username, role, and password."
                  : "Create a new account with username, department, role, and password."}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: "0.76rem", color: "rgba(166,195,205,0.62)" }}>
                Initial seeded accounts: demo.user / demo123, admin.user / admin123.
                New users can sign up directly from this page.
              </Typography>
            </Box>

            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="demo.user"
            />

            {mode === "signup" && (
              <FormControl fullWidth>
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  label="Department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value as "PSC" | "MFG")}
                >
                  {departments.map((item) => (
                    <MenuItem key={item.code} value={item.code}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                label="Role"
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target.value as
                      | "DEVELOPER"
                      | "SME"
                      | "LEAD"
                      | "MANAGER"
                      | "ADMIN",
                  )
                }
              >
                <MenuItem value="DEVELOPER">Developer</MenuItem>
                <MenuItem value="SME">SME</MenuItem>
                <MenuItem value="LEAD">Lead</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1.2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => {
                  clearAuthSession();
                  setUsername("demo.user");
                  setDepartment("PSC");
                  setRole("DEVELOPER");
                  setPassword("demo123");
                  setShowPassword(false);
                }}
                sx={{ borderRadius: 999, textTransform: "none" }}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={mode === "login" ? submitLogin : submitSignup}
                sx={{ borderRadius: 999, textTransform: "none", minWidth: 160 }}
              >
                {busy ? <PulseSpinner /> : mode === "login" ? "Login" : "Signup"}
              </Button>
            </Stack>

            <Typography sx={{ fontSize: "0.8rem", color: "rgba(166,195,205,0.75)" }}>
              {mode === "login" ? "New user? " : "Already have an account? "}
              <Typography
                component="span"
                sx={{ color: "#16c6b0", cursor: "pointer", fontWeight: 600 }}
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Signup" : "Login"}
              </Typography>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
