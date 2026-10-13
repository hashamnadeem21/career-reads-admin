import { LocalTime } from "@/components/admin/LocalTime";

/** "every subscriber" or "people who subscribed 1 Mar 2026 – 31 Mar 2026" ([from, to), shown inclusive). */
export function AudienceSummary({ from, to }: { from: Date | string | null; to: Date | string | null }) {
  if (!from && !to) return <>every subscriber</>;
  const lastDay = to ? new Date(new Date(to).getTime() - 60_000) : null;
  return (
    <>
      people who subscribed{" "}
      {from && lastDay ? (
        <>
          <LocalTime date={from} dateOnly /> – <LocalTime date={lastDay} dateOnly />
        </>
      ) : from ? (
        <>
          on or after <LocalTime date={from} dateOnly />
        </>
      ) : (
        <>
          up to <LocalTime date={lastDay!} dateOnly />
        </>
      )}
    </>
  );
}
