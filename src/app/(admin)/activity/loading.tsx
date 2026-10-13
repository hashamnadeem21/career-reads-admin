import { TableSkeleton } from "@/components/admin/Skeletons";

export default function Loading() {
  return <TableSkeleton label="activity" rows={10} />;
}
