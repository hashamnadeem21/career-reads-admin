"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { Switch } from "@/components/admin/Field";
import { GlassDialog } from "@/components/admin/GlassDialog";
import { DASHBOARD_CARDS, type DashboardCardId, type ResolvedLayout } from "@/lib/dashboard/layout";
import { cn } from "@/lib/utils";

const labels = Object.fromEntries(DASHBOARD_CARDS.map((c) => [c.id, c.label])) as Record<DashboardCardId, string>;

function Row({ id, visible, onToggle }: { id: DashboardCardId; visible: boolean; onToggle: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("glass-inset flex items-center gap-3 px-3 py-2", isDragging && "relative z-10 shadow-lg")}
    >
      <button
        type="button"
        className="cursor-grab rounded-md p-1 text-muted hover:bg-hover active:cursor-grabbing"
        aria-label={`Reorder ${labels[id]}. Press space, then arrow keys to move.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Switch label={labels[id]} checked={visible} onCheckedChange={onToggle} className="flex-1" />
    </li>
  );
}

/** Show, hide and drag to reorder dashboard cards; pick the content-mix style. */
export function CustomizeDialog({
  open,
  onOpenChange,
  layout,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: ResolvedLayout;
  onSave: (layout: ResolvedLayout) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(layout);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setDraft((d) => ({
      ...d,
      order: arrayMove(d.order, d.order.indexOf(active.id as DashboardCardId), d.order.indexOf(over.id as DashboardCardId)),
    }));
  };

  return (
    <GlassDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(layout);
        onOpenChange(o);
      }}
      title="Customize dashboard"
      description="Drag to reorder, switch cards on or off. Saved to your account."
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft({ order: DASHBOARD_CARDS.map((c) => c.id), hidden: [], mixStyle: "donut" })}>
            Reset
          </Button>
          <Button variant="primary" disabled={saving} onClick={() => onSave(draft)}>
            {saving ? "Saving…" : "Save layout"}
          </Button>
        </>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={draft.order} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {draft.order.map((id) => (
              <Row
                key={id}
                id={id}
                visible={!draft.hidden.includes(id)}
                onToggle={(v) => setDraft((d) => ({ ...d, hidden: v ? d.hidden.filter((h) => h !== id) : [...d.hidden, id] }))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <fieldset className="mt-5">
        <legend className="mb-2 text-[13px] font-medium text-muted">Content mix style</legend>
        <div className="flex gap-2">
          {(["donut", "bubble"] as const).map((style) => (
            <label key={style} className={cn("glass-inset flex flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-sm capitalize", draft.mixStyle === style && "border-primary")}>
              <input type="radio" name="mixStyle" value={style} checked={draft.mixStyle === style} onChange={() => setDraft((d) => ({ ...d, mixStyle: style }))} className="accent-[var(--primary)]" />
              {style === "donut" ? "Donut" : "Bubbles"}
            </label>
          ))}
        </div>
      </fieldset>
    </GlassDialog>
  );
}
