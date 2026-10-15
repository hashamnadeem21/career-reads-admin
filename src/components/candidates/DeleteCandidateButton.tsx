"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteCandidate } from "@/app/actions/candidates";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/GlassDialog";

/** For privacy requests: deletes the account and everything that belongs to it. */
export function DeleteCandidateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger">
          <Trash2 /> Delete account
        </Button>
      }
      title={`Delete ${name}'s account?`}
      description="Deletes their account and sign-in history, every application they made (employers can no longer see them) and their CVs, and their newsletter subscription. They're signed out everywhere. This can't be undone."
      confirmLabel="Delete everything"
      onConfirm={async () => {
        const result = await deleteCandidate(id);
        (result.ok ? toast.success : toast.error)(result.message);
        if (result.ok) router.push("/candidates");
      }}
    />
  );
}
