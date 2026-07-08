import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  preview: {
    id: string;
    title: string;
    fileName: string;
    extension: string;
    uploadedBy: string;
    departmentCode: string;
    sectionCode: string;
    version: number;
    status: string;
    previewable: boolean;
    type?: "text" | "image";
    content?: string;
    contentType?: string;
    message?: string;
  } | null;
  loading?: boolean;
}

export function DocumentPreviewModal({
  open,
  onClose,
  preview,
  loading,
}: DocumentPreviewModalProps) {
  if (!preview) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, rgba(22,82,92,0.3) 0%, rgba(11,22,31,0.95) 100%)",
          border: "1px solid rgba(22,200,200,0.2)",
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(22,200,200,0.15)",
          color: "#16c6b0",
          fontWeight: 600,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#16c6b0" }}>
            {preview.title}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.7)" }}>
            {preview.fileName}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 0,
            padding: 0.5,
            color: "rgba(166,195,205,0.7)",
            "&:hover": { color: "#16c6b0" },
          }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent
        sx={{
          py: 3,
          px: 3,
          background: "rgba(11, 22, 31, 0.3)",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#16c6b0" }} />
          </Box>
        ) : !preview.previewable ? (
          <Paper
            sx={{
              p: 3,
              background: "rgba(244, 67, 54, 0.1)",
              border: "1px solid rgba(244, 67, 54, 0.3)",
              borderRadius: 2,
            }}
          >
            <Typography sx={{ color: "#f44336", fontWeight: 500, mb: 1 }}>
              Preview Not Available
            </Typography>
            <Typography sx={{ color: "rgba(166,195,205,0.8)", fontSize: "0.9rem" }}>
              {preview.message}
            </Typography>
          </Paper>
        ) : preview.type === "image" ? (
          <Box sx={{ textAlign: "center" }}>
            <img
              src={preview.content}
              alt={preview.fileName}
              style={{
                maxWidth: "100%",
                maxHeight: "500px",
                borderRadius: 8,
                border: "1px solid rgba(22,200,200,0.2)",
              }}
            />
          </Box>
        ) : (
          <Paper
            sx={{
              p: 3,
              background: "rgba(11, 22, 31, 0.8)",
              border: "1px solid rgba(22,200,200,0.1)",
              borderRadius: 2,
              maxHeight: "500px",
              overflow: "auto",
              fontFamily: "'Courier New', monospace",
            }}
          >
            <Typography
              component="pre"
              sx={{
                color: "rgba(205,220,229,0.9)",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                whitespace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {preview.content}
            </Typography>
          </Paper>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Department
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {preview.departmentCode}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Section
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {preview.sectionCode}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Version
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              v{preview.version}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Status
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {preview.status}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Uploaded By
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {preview.uploadedBy}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid rgba(22,200,200,0.15)",
          p: 2,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(166,195,205,0.8)",
            "&:hover": { color: "#16c6b0" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
