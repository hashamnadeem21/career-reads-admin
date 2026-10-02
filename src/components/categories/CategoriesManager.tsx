"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tabs } from "radix-ui";
import { FolderTree, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategory, reorderCategories, saveCategory } from "@/app/actions/categories";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { ConfirmDialog, GlassDrawer } from "@/components/admin/GlassDialog";
import { CATEGORY_ACCENTS } from "@/lib/categories/schema";
import { cn, slugify } from "@/lib/utils";

export interface CategoryItem {
  slug: string;
  kind: "blog" | "job";
  name: string;
  headline: string;
  description: string;
  accent: string;
  usage: number;
}

type Kind = "blog" | "job";

function CategoryForm({ initial, onDone }: { initial: CategoryItem & { isNew: boolean }; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(!initial.isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (patch: Partial<CategoryItem>) =>
    setV((cur) => {
      const next = { ...cur, ...patch };
      if (!slugEdited && "name" in patch) next.slug = slugify(next.name);
      return next;
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveCategory({
            originalSlug: initial.isNew ? null : initial.slug,
            kind: v.kind,
            slug: v.slug,
            name: v.name,
            headline: v.headline,
            description: v.description,
            accent: v.accent,
          });
          setErrors(r.errors ?? {});
          (r.ok ? toast.success : toast.error)(r.message);
          if (r.ok) onDone();
        });
      }}
    >
      <Field label="Name" htmlFor="cat-name" required error={errors.name}>
        <Input id="cat-name" value={v.name} invalid={Boolean(errors.name)} onChange={(e) => set({ name: e.target.value })} autoFocus />
      </Field>
      <Field label="Slug" htmlFor="cat-slug" error={errors.slug} hint={v.kind === "blog" ? `/category/${v.slug || "…"}` : `/jobs?category=${v.slug || "…"}`}>
        <Input
          id="cat-slug"
          value={v.slug}
          invalid={Boolean(errors.slug)}
          onChange={(e) => {
            setSlugEdited(true);
            set({ slug: e.target.value.toLowerCase() });
          }}
        />
      </Field>
      {v.kind === "blog" && (
        <Field label="Page headline" htmlFor="cat-headline" required error={errors.headline} hint="The H1 and title of the category page">
          <Input id="cat-headline" value={v.headline} invalid={Boolean(errors.headline)} onChange={(e) => set({ headline: e.target.value })} />
        </Field>
      )}
      <Field label="Description" htmlFor="cat-description" required error={errors.description} counter={{ value: v.description.length, max: 300, min: 20 }}>
        <Textarea id="cat-description" rows={3} value={v.description} invalid={Boolean(errors.description)} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      {v.kind === "blog" && (
        <Field label="Accent colour" htmlFor="cat-accent" error={errors.accent}>
          <Select id="cat-accent" value={v.accent} onChange={(e) => set({ accent: e.target.value })}>
            <option value="">Choose…</option>
            {CATEGORY_ACCENTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : initial.isNew ? "Add category" : "Save changes"}
      </Button>
    </form>
  );
}

function Row({ item, onEdit }: { item: CategoryItem; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.slug });
  const router = useRouter();
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("glass-inset flex items-center gap-3 px-3 py-2.5", isDragging && "relative z-10 shadow-xl")}>
      <button type="button" className="cursor-grab rounded-md p-1 text-muted hover:bg-hover" aria-label={`Reorder ${item.name}. Press space, then arrow keys.`} {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {item.kind === "blog" && <span className={cn("h-3 w-3 shrink-0 rounded-full bg-gradient-to-r", item.accent)} aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="truncate text-xs text-muted">
          {item.slug} · {item.usage} {item.kind === "blog" ? "post" : "job"}
          {item.usage === 1 ? "" : "s"}
        </p>
      </div>
      <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${item.name}`}>
        <Pencil />
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${item.name}`} disabled={item.usage > 0} title={item.usage > 0 ? "In use: move its content first" : undefined}>
            <Trash2 />
          </Button>
        }
        title={`Delete "${item.name}"?`}
        description="It will disappear from the site's menus and filters."
        onConfirm={async () => {
          const r = await deleteCategory(item.slug);
          (r.ok ? toast.success : toast.error)(r.message);
          router.refresh();
        }}
      />
    </li>
  );
}

function SortableList({ kind, items, onEdit }: { kind: Kind; items: CategoryItem[]; onEdit: (i: CategoryItem) => void }) {
  const [order, setOrder] = useState(items);
  const [synced, setSynced] = useState(items);
  if (synced !== items) {
    setSynced(items);
    setOrder(items);
  }
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.findIndex((i) => i.slug === active.id), order.findIndex((i) => i.slug === over.id));
    setOrder(next);
    const r = await reorderCategories(kind, next.map((i) => i.slug));
    (r.ok ? toast.success : toast.error)(r.message);
    if (!r.ok) setOrder(items);
  };
  if (order.length === 0) return <EmptyState icon={FolderTree} title="No categories yet" />;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((i) => i.slug)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2" aria-label={`${kind === "blog" ? "Blog" : "Job"} categories`}>
          {order.map((item) => (
            <Row key={item.slug} item={item} onEdit={() => onEdit(item)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** Blog and job categories: add, rename, describe, drag to reorder, delete when unused. */
export function CategoriesManager({ blog, job }: { blog: CategoryItem[]; job: CategoryItem[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Kind>(params.get("tab") === "job" ? "job" : "blog");
  const [editing, setEditing] = useState<(CategoryItem & { isNew: boolean }) | null>(
    params.get("new") === "1" ? { slug: "", kind: "blog", name: "", headline: "", description: "", accent: CATEGORY_ACCENTS[0].value, usage: 0, isNew: true } : null,
  );

  const add = () => setEditing({ slug: "", kind: tab, name: "", headline: "", description: "", accent: CATEGORY_ACCENTS[0].value, usage: 0, isNew: true });

  return (
    <>
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as Kind)}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs.List aria-label="Category type" className="glass-inset inline-flex p-1">
            {(["blog", "job"] as const).map((k) => (
              <Tabs.Trigger key={k} value={k} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted data-[state=active]:bg-primary data-[state=active]:text-primary-ink">
                {k === "blog" ? `Blog (${blog.length})` : `Jobs (${job.length})`}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Button variant="primary" onClick={add}>
            <Plus /> Add {tab === "blog" ? "blog" : "job"} category
          </Button>
        </div>
        <p className="mb-3 text-[13px] text-muted">Drag to change the order used in menus and filters. Categories in use can&apos;t be deleted.</p>
        <Tabs.Content value="blog">
          <SortableList kind="blog" items={blog} onEdit={(i) => setEditing({ ...i, isNew: false })} />
        </Tabs.Content>
        <Tabs.Content value="job">
          <SortableList kind="job" items={job} onEdit={(i) => setEditing({ ...i, isNew: false })} />
        </Tabs.Content>
      </Tabs.Root>
      <GlassDrawer open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} title={editing?.isNew ? `New ${editing.kind === "blog" ? "blog" : "job"} category` : `Edit ${editing?.name ?? ""}`}>
        {editing && (
          <CategoryForm
            key={`${editing.kind}-${editing.slug}-${editing.isNew}`}
            initial={editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </GlassDrawer>
    </>
  );
}
