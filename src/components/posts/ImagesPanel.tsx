"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/admin/Button";
import { Field, Input, Select } from "@/components/admin/Field";
import { MediaPicker } from "@/components/media/MediaPicker";
import { buildOutline, placementOptions } from "@/lib/posts/outline";
import type { PostDraft } from "@/lib/posts/draft";
import { cn } from "@/lib/utils";

type Img = PostDraft["images"][number] & { id: string };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function Thumb({ src, siteOrigin, className }: { src: string; siteOrigin: string; className?: string }) {
  if (!src) {
    return (
      <span className={cn("glass-inset flex items-center justify-center text-faint", className)} aria-hidden>
        <ImagePlus className="h-5 w-5" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src.startsWith("/") ? `${siteOrigin}${src}` : src} alt="" className={cn("rounded-xl bg-inset object-cover", className)} />;
}

function ImageCard({
  image,
  index,
  options,
  missing,
  errors,
  siteOrigin,
  onChange,
  onRemove,
}: {
  image: Img;
  index: number;
  options: { value: string; label: string }[];
  missing: boolean;
  errors: Record<string, string>;
  siteOrigin: string;
  onChange: (next: Img) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  const id = (f: string) => `image-${image.id}-${f}`;
  const err = (f: string) => errors[`images.${index}.${f}`];
  const hasOption = options.some((o) => o.value === image.placement);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("glass-inset flex flex-col gap-3 p-3", isDragging && "relative z-10 shadow-xl")}>
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab rounded-md p-1 text-muted hover:bg-hover" aria-label={`Reorder image ${index + 1}. Press space, then arrow keys.`} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">Image {index + 1}</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onRemove} aria-label={`Remove image ${index + 1}`}>
          <Trash2 />
        </Button>
      </div>
      <div className="flex gap-3">
        <Thumb src={image.src} siteOrigin={siteOrigin} className="h-20 w-28 shrink-0" />
        <div className="flex flex-col justify-center gap-1.5">
          <MediaPicker
            onSelect={(m) => onChange({ ...image, src: m.url, width: m.width, height: m.height, alt: image.alt || m.alt })}
            trigger={<Button size="sm">{image.src ? "Replace" : "Choose image"}</Button>}
          />
          {err("src") && <p className="text-xs font-medium text-danger">Choose an image</p>}
        </div>
      </div>
      <Field label="Alt text" htmlFor={id("alt")} required error={err("alt")} counter={{ value: image.alt.length, max: 200, min: 10 }}>
        <Input id={id("alt")} value={image.alt} invalid={Boolean(err("alt"))} onChange={(e) => onChange({ ...image, alt: e.target.value })} />
      </Field>
      <Field label="Caption" htmlFor={id("caption")} hint="Optional, shown under the image">
        <Input id={id("caption")} value={image.caption} maxLength={200} onChange={(e) => onChange({ ...image, caption: e.target.value })} />
      </Field>
      <Field label="Show this image" htmlFor={id("placement")}>
        <Select id={id("placement")} value={image.placement} onChange={(e) => onChange({ ...image, placement: e.target.value })}>
          {!hasOption && <option value={image.placement}>Missing heading ({image.placement.slice(8)})</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      {missing && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          This heading no longer exists, so the image will show in the middle.
        </p>
      )}
    </li>
  );
}

/** Hero image + up to 3 placed images, with a mini outline showing where each lands. */
export function ImagesPanel({
  draft,
  update,
  errors,
  missingSections,
  siteOrigin,
}: {
  draft: PostDraft;
  update: (patch: Partial<PostDraft>) => void;
  errors: Record<string, string>;
  missingSections: number[];
  siteOrigin: string;
}) {
  const images = draft.images as Img[];
  const options = useMemo(() => placementOptions(draft.body), [draft.body]);
  const outline = useMemo(() => buildOutline(draft.body, draft.images), [draft.body, draft.images]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const setImages = (next: Img[]) => update({ images: next });
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setImages(arrayMove(images, images.findIndex((i) => i.id === active.id), images.findIndex((i) => i.id === over.id)));
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="hero-title">
        <h3 id="hero-title" className="mb-2 text-sm font-semibold">
          Hero image <span className="text-danger">*</span>
        </h3>
        <div className="flex flex-col gap-3">
          <Thumb src={draft.coverImage} siteOrigin={siteOrigin} className="aspect-[16/9] w-full" />
          <MediaPicker
            title="Choose the hero image"
            onSelect={(m) => update({ coverImage: m.url, coverWidth: m.width, coverHeight: m.height, coverAlt: draft.coverAlt || m.alt })}
            trigger={
              <Button size="sm" variant={errors.coverImage ? "danger" : "secondary"}>
                <ImagePlus /> {draft.coverImage ? "Replace hero image" : "Choose hero image"}
              </Button>
            }
          />
          {errors.coverImage && <p className="text-xs font-medium text-danger">{errors.coverImage}</p>}
          <Field label="Hero alt text" htmlFor="coverAlt" required error={errors.coverAlt} counter={{ value: draft.coverAlt.length, max: 200, min: 10 }}>
            <Input id="coverAlt" value={draft.coverAlt} invalid={Boolean(errors.coverAlt)} onChange={(e) => update({ coverAlt: e.target.value })} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="more-images-title">
        <div className="mb-2 flex items-center justify-between">
          <h3 id="more-images-title" className="text-sm font-semibold">
            More images <span className="num font-normal text-muted">{images.length}/3</span>
          </h3>
          <Button
            size="sm"
            disabled={images.length >= 3}
            onClick={() => setImages([...images, { id: newId(), src: "", alt: "", caption: "", width: 1600, height: 900, placement: "middle" }])}
          >
            <Plus /> Add image
          </Button>
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted">Optional. Add up to 3 images and choose where each one shows.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {images.map((img, i) => (
                  <ImageCard
                    key={img.id}
                    image={img}
                    index={i}
                    options={options}
                    missing={missingSections.includes(i)}
                    errors={errors}
                    siteOrigin={siteOrigin}
                    onChange={(next) => setImages(images.map((x) => (x.id === img.id ? next : x)))}
                    onRemove={() => setImages(images.filter((x) => x.id !== img.id))}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section aria-labelledby="outline-title">
        <h3 id="outline-title" className="mb-2 text-sm font-semibold">
          Where images land
        </h3>
        <ol className="glass-inset flex flex-col gap-1 p-3 text-xs">
          {outline.map((item, i) => (
            <li
              key={i}
              className={cn(
                "truncate rounded-md px-2 py-1",
                item.kind === "image" ? "bg-primary font-semibold text-primary-ink" : item.kind === "intro" ? "font-semibold text-muted" : "text-ink",
                item.depth === 3 && "ml-4",
              )}
            >
              {item.kind === "image" ? `▣ ${item.text}` : item.kind === "heading" ? `${item.depth === 2 ? "##" : "###"} ${item.text}` : item.text}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
