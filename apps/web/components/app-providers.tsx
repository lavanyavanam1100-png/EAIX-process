"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#16c6b0" },
    secondary: { main: "#ff8a65" },
    background: {
      default: "#081219",
      paper: "#0f1c28",
    },
    text: {
      primary: "#f4fbff",
      secondary: "#b8c9d4",
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Segoe UI Variable', 'Segoe UI', Tahoma, sans-serif",
    h1: { fontWeight: 700, letterSpacing: -0.9 },
    h2: { fontWeight: 700, letterSpacing: -0.5 },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NextTopLoader color="#16c6b0" showSpinner={false} height={3} crawlSpeed={120} />
      {children}
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
