"use client";

import { Box } from "@mui/material";

export function PulseSpinner() {
  return (
    <Box
      aria-label="loading"
      sx={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "2px solid rgba(22,198,176,0.2)",
        borderTopColor: "#16c6b0",
        animation: "spin 0.9s linear infinite",
        "@keyframes spin": {
          to: { transform: "rotate(360deg)" },
        },
      }}
    />
  );
}
