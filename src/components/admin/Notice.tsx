"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, [kind: "success" | "warning", text: string]> = {
  saved: ["success", "Saved. The site is up to date."],
  "saved-offline": ["warning", "Saved, but the public site couldn't be refreshed right now. It will update within the hour."],
  duplicated: ["success", "Copied as a new draft."],
  deleted: ["success", "Deleted."],
  submitted: ["success", "Sent for review. Career Reads will check it and publish it soon."],
  created: ["success", "Company created. Invite their team below."],
};
const FLAGS: Record<string, [param: string, value: string, text: string]> = {
  welcome: ["welcome", "1", "Welcome to Career Reads!"],
  password: ["password", "changed", "Password changed. You've been signed out on other devices."],
};

/** Shows a toast for ?notice=… after a redirect, then removes it from the URL. */
export function Notice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notice = params.get("notice");
  const flag = Object.values(FLAGS).find(([param, value]) => params.get(param) === value);

  useEffect(() => {
    if (!notice && !flag) return;
    const message = notice ? MESSAGES[notice] : undefined;
    if (message) (message[0] === "success" ? toast.success : toast.warning)(message[1]);
    if (flag) toast.success(flag[2]);
    const next = new URLSearchParams(params.toString());
    next.delete("notice");
    if (flag) next.delete(flag[0]);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [notice, flag, params, pathname, router]);

  return null;
}
