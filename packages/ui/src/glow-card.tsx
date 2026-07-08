"use client";

import type { ReactNode } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { motion } from "framer-motion";

interface GlowCardProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function GlowCard({ title, subtitle, icon, children }: GlowCardProps) {
  return (
    <Card
      component={motion.section}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      sx={{
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(160deg, rgba(19,31,43,0.92) 0%, rgba(14,24,34,0.85) 100%)",
        boxShadow: "0 20px 50px rgba(9, 16, 23, 0.45)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {icon}
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(220,232,241,0.78)", mt: 1 }}>
          {subtitle}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
