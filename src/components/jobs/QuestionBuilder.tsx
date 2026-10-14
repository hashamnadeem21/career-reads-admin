"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/admin/Button";
import { Field, Input, Select, Switch } from "@/components/admin/Field";
import type { QuestionDraft } from "@/lib/jobs/form-values";
import { MAX_QUESTIONS, QUESTION_KINDS, QUESTION_KIND_LABELS, type QuestionKind } from "@/shared/jobs/questions";

const isChoice = (kind: QuestionKind) => kind === "single_choice" || kind === "multi_choice";

let counter = 0;
const newKey = () => `q${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Common screening questions, one click each (like LinkedIn's). */
const SUGGESTIONS: Omit<QuestionDraft, "key">[] = [
  { kind: "number", label: "How many years of relevant experience do you have?", helpText: "", options: [], required: true },
  {
    kind: "single_choice",
    label: "What is your notice period?",
    helpText: "",
    options: ["I can start immediately", "2 weeks", "1 month", "2 months or more"],
    required: false,
  },
  { kind: "short_text", label: "What are your salary expectations?", helpText: "", options: [], required: false },
  { kind: "yes_no", label: "Are you willing to relocate?", helpText: "", options: [], required: false },
  { kind: "url", label: "Link to your portfolio, GitHub or work samples", helpText: "", options: [], required: false },
];

export function blankQuestion(kind: QuestionKind = "short_text"): QuestionDraft {
  return { key: newKey(), kind, label: "", helpText: "", options: isChoice(kind) ? ["", ""] : [], required: false };
}

/**
 * Screening questions for the application form, in order. The job form posts them as one JSON
 * field (`questionsField`); errors come back keyed `questions.<index>.<field>`.
 */
export function QuestionBuilder({
  value,
  onChange,
  error,
}: {
  value: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
  error: (key: string) => string[] | undefined;
}) {
  const update = (index: number, patch: Partial<QuestionDraft>) => onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };
  const full = value.length >= MAX_QUESTIONS;
  const unused = SUGGESTIONS.filter((s) => !value.some((q) => q.label === s.label));

  return (
    <div className="flex flex-col gap-3">
      {error("questions") && <p className="text-xs font-medium text-danger">{error("questions")}</p>}

      {value.length === 0 && (
        <p className="glass-inset px-4 py-3 text-sm text-muted">
          No questions: candidates send their details and CV only. Add questions to screen applicants, for example their notice period or
          years of experience.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {value.map((q, index) => {
          const err = (field: string) => error(`questions.${index}.${field}`);
          const labelId = `question-${q.key}-label`;
          return (
            <li key={q.key} className="glass-inset flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Question {index + 1}</span>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="Question" htmlFor={labelId} required error={err("label")}>
                  <Input
                    id={labelId}
                    value={q.label}
                    maxLength={200}
                    invalid={Boolean(err("label"))}
                    placeholder="e.g. Do you have a valid driving licence?"
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </Field>
                <Field label="Answer type" htmlFor={`question-${q.key}-kind`} error={err("kind")}>
                  <Select
                    id={`question-${q.key}-kind`}
                    value={q.kind}
                    onChange={(e) => {
                      const kind = e.target.value as QuestionKind;
                      update(index, { kind, options: isChoice(kind) ? (q.options.length ? q.options : ["", ""]) : [] });
                    }}
                  >
                    {QUESTION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {QUESTION_KIND_LABELS[k]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {isChoice(q.kind) && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-[13px] font-medium text-muted">Choices</legend>
                  {q.options.map((option, o) => (
                    <div key={o} className="flex items-center gap-2">
                      <Input
                        aria-label={`Choice ${o + 1}`}
                        value={option}
                        maxLength={100}
                        invalid={Boolean(err("options"))}
                        onChange={(e) => update(index, { options: q.options.map((x, j) => (j === o ? e.target.value : x)) })}
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove choice ${o + 1}`}
                        disabled={q.options.length <= 2}
                        onClick={() => update(index, { options: q.options.filter((_, j) => j !== o) })}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  {err("options") && <p className="text-xs font-medium text-danger">{err("options")}</p>}
                  {q.options.length < 20 && (
                    <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => update(index, { options: [...q.options, ""] })}>
                      <Plus /> Add a choice
                    </Button>
                  )}
                </fieldset>
              )}

              <Field label="Hint" htmlFor={`question-${q.key}-help`} hint="Optional, shown under the question" error={err("helpText")}>
                <Input id={`question-${q.key}-help`} value={q.helpText} maxLength={300} onChange={(e) => update(index, { helpText: e.target.value })} />
              </Field>
              <Switch
                label="Required"
                description="Candidates can't apply without answering"
                checked={q.required}
                onCheckedChange={(required) => update(index, { required })}
              />
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={full} onClick={() => onChange([...value, blankQuestion()])}>
          <Plus /> Add a question
        </Button>
        {!full &&
          unused.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onChange([...value, { ...s, key: newKey() }])}
              className="rounded-full border border-glass-border px-3 py-1 text-xs font-medium text-muted hover:bg-hover hover:text-ink"
            >
              + {s.label}
            </button>
          ))}
      </div>
      {full && <p className="text-xs text-muted">That&apos;s the most questions a job can have ({MAX_QUESTIONS}).</p>}
    </div>
  );
}
