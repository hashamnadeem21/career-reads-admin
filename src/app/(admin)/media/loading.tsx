import { GridSkeleton } from "@/components/admin/Skeletons";

export default function Loading() {
  return <GridSkeleton label="media" cards={12} tall />;
}
