"use client";

import { Pause, Play, Plus, Settings2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCompany, setCompanyActive } from "@/app/actions/companies";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog, GlassDialog } from "@/components/admin/GlassDialog";
import { CompanyForm, type CompanyFormValues } from "./CompanyForm";

/** "New company" button + dialog on the Companies list. */
export function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  return (
    <GlassDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="primary">
          <Plus /> New company
        </Button>
      }
      title="Add a company"
      description="After creating it, invite people from the company so they can post jobs."
    >
      <CompanyForm initial={{ name: "", website: "", autoPublish: false }} />
    </GlassDialog>
  );
}

/** Edit · Pause/Reactivate · Delete on a company's page. */
export function CompanyActions({ company, active }: { company: CompanyFormValues & { id: string }; active: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <GlassDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={
          <Button size="sm">
            <Settings2 /> Edit
          </Button>
        }
        title={`Edit ${company.name}`}
      >
        <CompanyForm
          initial={company}
          onDone={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </GlassDialog>
      {active ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" disabled={pending}>
              <Pause /> Pause
            </Button>
          }
          title={`Pause ${company.name}?`}
          description="Everyone at the company is signed out and can't sign in until you reactivate it. Their jobs stay as they are."
          confirmLabel="Pause company"
          tone="primary"
          onConfirm={() =>
            start(async () => {
              const r = await setCompanyActive(company.id, false);
              (r.ok ? toast.success : toast.error)(r.message);
              router.refresh();
            })
          }
        />
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setCompanyActive(company.id, true);
              (r.ok ? toast.success : toast.error)(r.message);
              router.refresh();
            })
          }
        >
          <Play /> Reactivate
        </Button>
      )}
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger" disabled={pending}>
            <Trash2 /> Delete
          </Button>
        }
        title={`Delete ${company.name}?`}
        description="Their user accounts and invites are deleted. Their jobs and stats are kept and become Career Reads jobs, so nothing disappears from the site."
        confirmLabel="Delete company"
        onConfirm={() => deleteCompany(company.id)}
      />
    </div>
  );
}
