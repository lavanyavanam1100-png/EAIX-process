"use client";

import { Suspense, useEffect, useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import {
  approveContent,
  fetchAuthProfile,
  fetchReviewQueue,
  rejectContent,
  type ApprovalQueueItem,
} from "../../../lib/eaix-api";
import { getWorkspaceFromParams } from "../../../lib/workspace";
import { canViewReview } from "../../../lib/access";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { toast } from "sonner";

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const selection = getWorkspaceFromParams(searchParams);

  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [actor, setActor] = useState("demo.user");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const isApprover = !!selection?.role && canViewReview(selection.role);

  const loadQueue = () => {
    fetchReviewQueue()
      .then((items) => setQueue(items))
      .catch(() => toast.error("Failed to load review queue."));
  };

  useEffect(() => {
    loadQueue();
    fetchAuthProfile()
      .then((profile) => setActor(profile.username))
      .catch(() => setActor("demo.user"));
  }, []);

  if (!selection) {
    return null;
  }

  const scopedQueue = queue;

  const approve = async (contentId: string) => {
    const result = await approveContent(contentId, actor);
    if (result.ok === false) {
      toast.error(result.reason ?? "Approval failed");
      return;
    }

    toast.success("Content approved.");
    loadQueue();
  };

  const reject = async (contentId: string) => {
    const comments = notes[contentId] ?? "Needs revision.";
    const result = await rejectContent(contentId, actor, comments);
    if (result.ok === false) {
      toast.error(result.reason ?? "Rejection failed");
      return;
    }

    toast.success("Content rejected with comments.");
    loadQueue();
  };

  if (!canViewReview(selection.role)) {
    return (
      <WorkspaceShell
        title="Review Queue"
        subtitle="Access is restricted based on role policy."
        department={selection.department}
        role={selection.role}
        activeTab="UPLOAD"
      >
        <Typography sx={{ color: "rgba(196,212,221,0.85)" }}>
          Review queue is visible only for Lead, Department Head, and Super User.
        </Typography>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Review Queue"
      subtitle="Approve or reject pending submissions with comments."
      department={selection.department}
      role={selection.role}
      activeTab="REVIEW"
    >
      <Stack spacing={1.2}>
        {scopedQueue.length === 0 ? (
          <Typography sx={{ color: "rgba(196,212,221,0.85)" }}>No pending records.</Typography>
        ) : (
          scopedQueue.map((item) => (
            <Paper key={item.contentId} sx={{ p: 2, borderRadius: 3, background: "rgba(11,22,31,0.88)" }}>
              <Stack spacing={1.1}>
                <Typography fontWeight={700}>{item.title}</Typography>
                <Typography sx={{ color: "rgba(194,211,220,0.84)" }}>
                  Requested by {item.requestedBy}
                </Typography>

                {isApprover ? (
                  <>
                    <TextField
                      size="small"
                      label="Review comments"
                      value={notes[item.contentId] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.contentId]: e.target.value }))
                      }
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button variant="contained" onClick={() => approve(item.contentId)}>
                        Approve
                      </Button>
                      <Button color="warning" variant="outlined" onClick={() => reject(item.contentId)}>
                        Reject
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography variant="caption" sx={{ color: "rgba(170,198,208,0.9)" }}>
                    Approver role required. You can monitor status here.
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </WorkspaceShell>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 3 }}>Loading review queue...</Box>}>
      <ReviewPageContent />
    </Suspense>
  );
}
