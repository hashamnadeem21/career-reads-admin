"use client";

import dynamic from "next/dynamic";

/** Charts load after first paint (next/dynamic) and reserve their height so nothing shifts. */
const reserve = (height: number) =>
  function ChartSkeleton() {
    return <div className="skeleton w-full" style={{ height }} aria-hidden />;
  };

export const Sparkline = dynamic(() => import("./Sparkline"), { ssr: false, loading: reserve(48) });
export const TrafficChart = dynamic(() => import("./TrafficChart"), { ssr: false, loading: reserve(280) });
export const MixDonut = dynamic(() => import("./MixDonut"), { ssr: false, loading: reserve(200) });
