"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, [kind: "success" | "warning", text: string]> = {
  saved: ["success", "Saved. The site is up to date."],
  "saved-offline": ["warning", "Saved, but the public site couldn't be refreshed right now. It will update within the hour."],
  duplicated: ["success", "Copied as a new draft."],
  deleted: ["success", "Deleted."],
};

/** Shows a toast for ?notice=… after a redirect, then removes it from the URL. */
export function Notice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notice = params.get("notice");

  useEffect(() => {
    if (!notice) return;
    const message = MESSAGES[notice];
    if (message) (message[0] === "success" ? toast.success : toast.warning)(message[1]);
    const next = new URLSearchParams(params.toString());
    next.delete("notice");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [notice, params, pathname, router]);

  return null;
}
