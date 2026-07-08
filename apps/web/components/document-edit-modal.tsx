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
  TextField,
} from "@mui/material";
import { X, Save } from "lucide-react";
import { useState } from "react";

interface DocumentEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (content: string) => Promise<void>;
  document: {
    id: string;
    title: string;
    fileName: string;
    extension: string;
    uploadedBy: string;
    departmentCode: string;
    sectionCode: string;
    version: number;
    status: string;
    content?: string;
    message?: string;
  } | null;
  loading?: boolean;
}

const EDITABLE_EXTENSIONS = ["txt", "doc", "docx"];

export function DocumentEditModal({
  open,
  onClose,
  onSave,
  document,
  loading,
}: DocumentEditModalProps) {
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenEdit = () => {
    if (document?.content) {
      setEditContent(document.content);
    }
  };

  const isEditable =
    document && EDITABLE_EXTENSIONS.includes(document.extension.toLowerCase());

  const handleSave = async () => {
    if (!onSave || !document) return;

    setSaving(true);
    try {
      await onSave(editContent);
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  // Initialize content when modal opens
  if (open && !editContent && document.content) {
    handleOpenEdit();
  }

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
            Edit: {document.title}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.7)" }}>
            {document.fileName}
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
        ) : !isEditable ? (
          <Paper
            sx={{
              p: 3,
              background: "rgba(255, 152, 0, 0.1)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
              borderRadius: 2,
            }}
          >
            <Typography sx={{ color: "#ff9800", fontWeight: 500, mb: 1 }}>
              Cannot Edit This File Type
            </Typography>
            <Typography sx={{ color: "rgba(166,195,205,0.8)", fontSize: "0.9rem" }}>
              Only .txt, .doc, and .docx files can be edited. 
              {document.message && ` ${document.message}`}
            </Typography>
          </Paper>
        ) : (
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter document content..."
            disabled={saving}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "rgba(205,220,229,0.9)",
                fontFamily: "'Courier New', monospace",
                fontSize: "0.9rem",
                "& fieldset": {
                  borderColor: "rgba(22,200,200,0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(22,200,200,0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#16c6b0",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "rgba(166,195,205,0.4)",
                opacity: 1,
              },
            }}
          />
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Department
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {document.departmentCode}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Section
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {document.sectionCode}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Version
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              v{document.version}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Status
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {document.status}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(166,195,205,0.6)" }}>
              Uploaded By
            </Typography>
            <Typography sx={{ color: "rgba(205,220,229,0.9)", fontSize: "0.9rem" }}>
              {document.uploadedBy}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid rgba(22,200,200,0.15)",
          p: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(166,195,205,0.8)",
            "&:hover": { color: "#16c6b0" },
          }}
        >
          Cancel
        </Button>
        {isEditable && (
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{
              background: "#16c6b0",
              color: "#0b161f",
              fontWeight: 600,
              "&:hover": { background: "#0fa39e" },
              "&:disabled": { opacity: 0.6 },
            }}
            startIcon={saving ? undefined : <Save size={18} />}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
