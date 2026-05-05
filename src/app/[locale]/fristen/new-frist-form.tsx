"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { createFrist } from "./actions";

type Project = { id: string; identifier: string; name: string };

const TYPICAL_TASKS: Array<{ task: string; basis: string; days: number }> = [
  { task: "Behinderungsanzeige (BHA) versenden", basis: "§ 6 Abs. 1 VOB/B", days: 5 },
  { task: "Bedenkenanmeldung versenden", basis: "§ 4 Abs. 3 VOB/B", days: 2 },
  {
    task: "Mehrkosten-Ankündigung vor Ausführung",
    basis: "§ 2 Abs. 5 VOB/B",
    days: 1,
  },
  { task: "Mangelrüge beantworten", basis: "§ 13 Abs. 5 VOB/B", days: 14 },
  { task: "Nachtragsangebot erstellen", basis: "§ 2 Abs. 6 VOB/B", days: 14 },
  { task: "Schlussrechnung vorlegen", basis: "§ 14 VOB/B", days: 30 },
];

function isoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function NewFristForm({
  projects,
  defaultProjectId,
}: {
  projects: Project[];
  defaultProjectId?: string;
}) {
  const t = useTranslations("modules.fristen.form");
  const [state, formAction] = useActionState(createFrist, null);
  const formRef = useRef<HTMLFormElement>(null);
  const taskRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);
  const basisRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      push({
        tone: "success",
        title: t("createdToast"),
      });
    }
  }, [success, push, t]);

  function applyTemplate(t: (typeof TYPICAL_TASKS)[number]) {
    if (taskRef.current) taskRef.current.value = t.task;
    if (basisRef.current) basisRef.current.value = t.basis;
    if (deadlineRef.current) deadlineRef.current.value = isoPlus(t.days);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-5"
    >
      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-2">
          {t("templatesLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          {TYPICAL_TASKS.map((tt) => (
            <button
              key={tt.task}
              type="button"
              onClick={() => applyTemplate(tt)}
              className="text-xs rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              {tt.task}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="task"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            {t("taskLabel")}
          </label>
          <input
            ref={taskRef}
            id="task"
            name="task"
            type="text"
            required
            placeholder={t("taskPlaceholder")}
            className={
              "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none transition-colors " +
              (fieldErrors?.task
                ? "border-[color:var(--color-critical)]"
                : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
            }
          />
          {fieldErrors?.task?.[0] ? (
            <p className="mt-1 text-xs text-[color:var(--color-critical)]">
              {fieldErrors.task[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="deadline"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            {t("deadlineLabel")}
          </label>
          <input
            ref={deadlineRef}
            id="deadline"
            name="deadline"
            type="date"
            required
            className={
              "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:outline-none transition-colors " +
              (fieldErrors?.deadline
                ? "border-[color:var(--color-critical)]"
                : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
            }
          />
          {fieldErrors?.deadline?.[0] ? (
            <p className="mt-1 text-xs text-[color:var(--color-critical)]">
              {fieldErrors.deadline[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="projectId"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            {t("projectLabel")}
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={defaultProjectId ?? ""}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="">{t("noProject")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.identifier} · {p.name}
              </option>
            ))}
          </select>
          {fieldErrors?.projectId?.[0] ? (
            <p className="mt-1 text-xs text-[color:var(--color-critical)]">
              {fieldErrors.projectId[0]}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="legalBasis"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            {t("legalBasisLabel")}
          </label>
          <input
            ref={basisRef}
            id="legalBasis"
            name="legalBasis"
            type="text"
            placeholder={t("legalBasisPlaceholder")}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {t("hint")}
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const t = useTranslations("modules.fristen.form");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? t("submitting") : <>{t("submit")} <span aria-hidden>→</span></>}
    </button>
  );
}
