"use client";

import type { ReactNode } from "react";
import { Button as MuiButton } from "@mui/material";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Button = ({ children, className, onClick }: ButtonProps) => {
  return (
    <MuiButton
      className={className}
      onClick={onClick}
      variant="contained"
      sx={{
        borderRadius: "999px",
        textTransform: "none",
        px: 2.4,
      }}
    >
      {children}
    </MuiButton>
  );
};
