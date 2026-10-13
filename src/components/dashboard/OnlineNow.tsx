"use client";

import { useEffect, useState } from "react";
import { fetchOnlineNow } from "@/app/actions/dashboard";
import { formatNumber } from "@/lib/utils";

/** How often the count refreshes while the dashboard is visible. Site tabs ping every 20s. */
const POLL_MS = 15_000;

/** "● 3 online now": people on the public site right now, refreshed while this tab is visible. */
export function OnlineNow({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => fetchOnlineNow().then(setCount, () => {});
    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      if (document.visibilityState !== "visible") return;
      void refresh();
      timer = window.setInterval(refresh, POLL_MS);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <p className="glass-inset flex items-center gap-2 px-3 py-1.5 text-xs" aria-live="polite" title="People with the site open right now">
      <span className="relative flex h-2 w-2" aria-hidden>
        {count > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-3 opacity-60 motion-reduce:animate-none" />}
        <span className={count > 0 ? "relative h-2 w-2 rounded-full bg-chart-3" : "relative h-2 w-2 rounded-full bg-faint"} />
      </span>
      <span className="num font-semibold">{formatNumber(count)}</span>
      <span className="text-muted">online now</span>
    </p>
  );
}
