"use client";

import { Link } from "@/i18n/navigation";
import { useState, useMemo } from "react";
import { formatDateShort, timeAgo, urgencyClasses } from "@/lib/utils";
import type { BautagebuchCategory, WeatherCondition } from "@/db/schema";
import { CATEGORY_LABEL, WEATHER_LABEL } from "./constants";
import {
  createVorgangFromBautagebuchEntry,
  deleteBautagebuchEntry,
} from "./actions";

type Entry = {
  id: string;
  authorName: string;
  text: string;
  category: BautagebuchCategory;
  entryDate: string;
  weatherCondition: WeatherCondition | null;
  temperatureCelsius: number | null;
  staffHoursOwn: number | null;
  staffHoursSubcontractors: number | null;
  equipment: string | null;
  attachmentRefs: string | null;
  trigger: string | null;
  triggerLabel: string | null;
  urgency: "critical" | "warning" | "info";
  suggestion: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string | null;
};

type Project = { id: string; identifier: string; name: string };

const FILTERS = [
  { id: "all", label: "Alle" },
  { id: "trigger", label: "Mit Trigger" },
  { id: "critical", label: "Kritisch" },
  { id: "anordnung", label: "Anordnung" },
  { id: "behinderung", label: "Behinderung" },
  { id: "mangel", label: "Mangel" },
] as const;

export function EntriesList({
  entries,
  projects,
}: {
  entries: Entry[];
  projects: Project[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let xs = entries;
    if (filter === "trigger") xs = xs.filter((e) => e.trigger);
    else if (filter === "critical") xs = xs.filter((e) => e.urgency === "critical");
    else if (filter === "anordnung")
      xs = xs.filter((e) => e.category === "anordnung" || e.trigger === "anordnung");
    else if (filter === "behinderung")
      xs = xs.filter(
        (e) => e.category === "behinderung" || e.trigger === "behinderung"
      );
    else if (filter === "mangel")
      xs = xs.filter((e) => e.category === "mangel" || e.trigger === "mangelruege");
    if (search.trim()) {
      const s = search.toLowerCase();
      xs = xs.filter(
        (e) =>
          e.text.toLowerCase().includes(s) ||
          e.authorName.toLowerCase().includes(s) ||
          (e.triggerLabel ?? "").toLowerCase().includes(s) ||
          (e.equipment ?? "").toLowerCase().includes(s)
      );
    }
    return xs;
  }, [entries, filter, search]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      trigger: entries.filter((e) => e.trigger).length,
      critical: entries.filter((e) => e.urgency === "critical").length,
      anordnung: entries.filter(
        (e) => e.category === "anordnung" || e.trigger === "anordnung"
      ).length,
      behinderung: entries.filter(
        (e) => e.category === "behinderung" || e.trigger === "behinderung"
      ).length,
      mangel: entries.filter(
        (e) => e.category === "mangel" || e.trigger === "mangelruege"
      ).length,
    }),
    [entries]
  );

  return (
    <section className="pb-16">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Verlauf · {filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Volltext-Suche…"
            className="bg-[color:var(--color-bg-subtle)] border border-transparent rounded-full px-4 py-1.5 text-xs text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-border)] focus:outline-none w-56"
          />
          <Link
            href="/bautagebuch/print"
            target="_blank"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors px-3 py-1.5"
          >
            Druckansicht ↗
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const c = counts[f.id];
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-xs rounded-full px-4 py-1.5 transition-colors ${
                isActive
                  ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
                  : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              }`}
            >
              {f.label} <span className="font-mono opacity-60">{c}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-sm text-[color:var(--color-fg-muted)] border border-dashed border-[color:var(--color-border)] rounded-md">
          Keine Einträge in dieser Filterung.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {filtered.map((e) => (
            <EntryRow key={e.id} entry={e} projects={projects} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryRow({ entry, projects }: { entry: Entry; projects: Project[] }) {
  const proj = projects.find((p) => p.id === entry.projectId);
  const isEdited = entry.updatedAt.getTime() - entry.createdAt.getTime() > 5_000;
  const totalHours =
    (entry.staffHoursOwn ?? 0) + (entry.staffHoursSubcontractors ?? 0);

  return (
    <li className="py-6 grid gap-4 md:grid-cols-12 group/row">
      <div className="md:col-span-2">
        <div className="font-mono text-sm text-[color:var(--color-fg)] font-medium">
          {formatDateShort(entry.entryDate)}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          erfasst {timeAgo(entry.createdAt)}
          {isEdited ? (
            <>
              {" · "}
              <span className="text-[color:var(--color-warning)]">geändert</span>
            </>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-grid place-items-center w-7 h-7 rounded-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] text-[10px] font-mono font-semibold text-[color:var(--color-fg-muted)]">
            {entry.authorName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {entry.authorName}
          </span>
        </div>
        {proj ? (
          <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            {proj.identifier}
          </div>
        ) : null}
      </div>

      <div className="md:col-span-10">
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-sm px-1.5 py-0.5 text-[color:var(--color-fg)]">
            {CATEGORY_LABEL[entry.category]}
          </span>
          {entry.weatherCondition ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {WEATHER_LABEL[entry.weatherCondition]}
              {entry.temperatureCelsius !== null
                ? ` · ${entry.temperatureCelsius} °C`
                : ""}
            </span>
          ) : null}
          {totalHours > 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {totalHours} h
              {entry.staffHoursOwn !== null && entry.staffHoursSubcontractors !== null
                ? ` (${entry.staffHoursOwn}+${entry.staffHoursSubcontractors})`
                : ""}
            </span>
          ) : null}
        </div>

        <p className="text-base text-[color:var(--color-fg)] leading-relaxed whitespace-pre-wrap">
          {entry.text}
        </p>

        {entry.equipment ? (
          <p className="mt-2 text-[12px] text-[color:var(--color-fg-muted)] font-mono">
            Geräte: {entry.equipment}
          </p>
        ) : null}
        {entry.attachmentRefs ? (
          <p className="mt-1 text-[12px] text-[color:var(--color-fg-muted)] font-mono">
            Anlagen: {entry.attachmentRefs}
          </p>
        ) : null}

        {entry.trigger ? (
          <div className="mt-3 border-l-2 border-[color:var(--color-accent)] pl-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${urgencyClasses(entry.urgency)}`}
              >
                ⚡ {entry.triggerLabel}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                Auto-erkannt
              </span>
            </div>
            {entry.suggestion ? (
              <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                {entry.suggestion}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-3 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Link
            href={`/bautagebuch/${entry.id}/edit`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            Bearbeiten
          </Link>
          {entry.category === "behinderung" || entry.category === "bedenken" ? (
            <Link
              href={`/anzeigen/new?fromBautagebuch=${entry.id}&kind=${
                entry.category === "bedenken" ? "bedenken" : "behinderung"
              }`}
              className="text-xs text-[color:var(--color-accent)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              → Anzeige erzeugen
            </Link>
          ) : null}
          {entry.urgency !== "info" || entry.trigger ? (
            <form action={createVorgangFromBautagebuchEntry}>
              <input type="hidden" name="entryId" value={entry.id} />
              <button
                type="submit"
                className="text-xs text-[color:var(--color-accent)] hover:text-[color:var(--color-fg)] transition-colors"
              >
                → In Vorgang überführen
              </button>
            </form>
          ) : null}
          <form
            action={deleteBautagebuchEntry}
            onSubmit={(e) => {
              if (!confirm("Diesen Eintrag wirklich löschen? Bautagebücher sollten zur Beweissicherung dauerhaft erhalten bleiben.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Löschen
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
