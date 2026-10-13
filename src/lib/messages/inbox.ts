import type { Tone } from "@/components/admin/Badge";
import { firstName, formatDate } from "@/lib/utils";

export interface InboxMessage {
  id: number;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

/** The contact form's topics (`contactTopics` on the site), with a colour each. Unknown topics fall back to neutral. */
const TOPIC_TONES: Record<string, Tone> = {
  general: "neutral",
  feedback: "info",
  correction: "warning",
  advertising: "success",
  partnership: "success",
};

export function topicTone(topic: string): Tone {
  return TOPIC_TONES[topic] ?? "neutral";
}

/** Case-insensitive match on name, email, topic and text. */
export function matchesQuery(m: InboxMessage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [m.name, m.email, m.topic ?? "", m.message].some((field) => field.toLowerCase().includes(q));
}

const DAY_MS = 86_400_000;

/** Days are counted in UTC, like `formatDate`, so the server and browser agree. */
function utcDay(value: string | Date): number {
  const d = new Date(value);
  return Math.floor(d.getTime() / DAY_MS);
}

export type DayGroup = "Today" | "Yesterday" | "This week" | "Earlier";

export function dayGroup(value: string, now: Date = new Date()): DayGroup {
  const diff = utcDay(now) - utcDay(value);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

/** Newest-first messages split into Today / Yesterday / This week / Earlier, keeping order. */
export function groupByDay<T extends { createdAt: string }>(items: T[], now: Date = new Date()): { label: DayGroup; items: T[] }[] {
  const groups: { label: DayGroup; items: T[] }[] = [];
  for (const item of items) {
    const label = dayGroup(item.createdAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

const SIGN_OFF = "\n\nBest,\nThe Career Reads team";

/** One-click starting points for a reply. Topic-specific ones only show for that topic. */
export function replyTemplates(m: Pick<InboxMessage, "name" | "topic">): { label: string; text: string }[] {
  const hi = `Hi ${firstName(m.name)},\n\n`;
  const templates = [
    { label: "Thanks", text: `${hi}Thanks for getting in touch with Career Reads. ` },
    { label: "Looking into it", text: `${hi}Thanks for letting us know. We're looking into it and will get back to you soon.${SIGN_OFF}` },
  ];
  if (m.topic === "correction" || m.topic === "feedback") {
    templates.push({ label: "Fixed", text: `${hi}Thanks for flagging this. It's fixed now and the page has been updated.${SIGN_OFF}` });
  }
  if (m.topic === "advertising" || m.topic === "partnership") {
    templates.push({
      label: "Ask for details",
      text: `${hi}Thanks for your interest in working with Career Reads. Could you share a little more about what you have in mind, along with your timing and budget?${SIGN_OFF}`,
    });
  }
  return templates;
}

/** Long originals are cut so the mailto: link stays within what email apps accept. */
const QUOTE_MAX = 600;

/** A mailto: link with the subject set, the draft as the body and their message quoted underneath. */
export function replyMailto(m: InboxMessage, draft: string): string {
  const subject = `Re: your message to Career Reads${m.topic ? ` (${m.topic})` : ""}`;
  const original = m.message.length > QUOTE_MAX ? `${m.message.slice(0, QUOTE_MAX).trimEnd()}…` : m.message;
  const quote = original
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const body = `${draft.trim()}\n\nOn ${formatDate(m.createdAt)}, ${m.name} wrote:\n${quote}`.trimStart();
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
