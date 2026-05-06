"use client";

import { useState, useTransition } from "react";

type Turn = {
  id: string;
  question: string;
  answer: string;
  at: Date;
};

const SAMPLE_QUESTIONS = [
  "Welche Schritte umfasst der RGB-Freigabeprozess für Nachträge?",
  "Wer ist im RGB-System für die Prüfung von Subunternehmer-Verträgen zuständig?",
  "Welche internen Fristen gelten für die Bearbeitung einer Mangelanzeige?",
  "Wie ist der Eskalationspfad bei Bauablaufstörungen geregelt?",
];

function mockAnswer(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes("nachtr") || lower.includes("freigabe")) {
    return [
      "Im RGB-Freigabeprozess für Nachträge sind drei Stufen vorgesehen:",
      "",
      "1. Erstprüfung durch die Bauleitung (fachlich/preislich plausibel?).",
      "2. Kaufmännische Gegenrechnung (Budget, kumulierte Nachträge, LV-Bezug).",
      "3. Freigabe durch die Projektleitung — ab 25.000 € zusätzlich durch die Geschäftsführung.",
      "",
      "Demo-Antwort: in der Live-Version aus der internen Wissensbasis abgeleitet.",
    ].join("\n");
  }
  if (lower.includes("subunternehm") || lower.includes("nu-vertrag") || lower.includes("nachunternehm")) {
    return [
      "Subunternehmer-Verträge laufen im RGB-System über das Einkaufs-Team.",
      "Die rechtliche Prüfung (insb. § 13b UStG, § 48 EStG, Sicherheitseinbehalt) wird zentral durch die Rechtsabteilung freigegeben.",
      "Bauleitung erhält den finalen Vertrag erst nach Freigabe zur Kenntnis.",
      "",
      "Demo-Antwort.",
    ].join("\n");
  }
  if (lower.includes("mangel") || lower.includes("rüge") || lower.includes("ruege")) {
    return [
      "Interne Frist für die Bearbeitung einer Mangelanzeige im RGB-System: 5 Werktage zur ersten Stellungnahme, 15 Werktage zur abschließenden Bewertung.",
      "Bei sicherheitsrelevanten Mängeln verkürzt sich die Erststellungnahme auf 24 Stunden.",
      "",
      "Demo-Antwort.",
    ].join("\n");
  }
  if (lower.includes("eskalat") || lower.includes("störung") || lower.includes("stoerung") || lower.includes("ablauf")) {
    return [
      "Eskalationspfad bei Bauablaufstörungen:",
      "",
      "Stufe 1: Bauleitung dokumentiert die Störung im Bautagebuch und informiert den AG schriftlich.",
      "Stufe 2: Projektleitung prüft Anspruchsgrundlage (§ 6 VOB/B, gestörter Bauablauf) und stellt Mehrkosten zusammen.",
      "Stufe 3: Geschäftsführung wird ab > 4 Wochen Verzug oder > 50.000 € Mehraufwand involviert.",
      "",
      "Demo-Antwort.",
    ].join("\n");
  }
  return [
    "Demo-Antwort: In der Live-Version würde hier ein Auszug aus der RGB-Wissensbasis erscheinen, kontextualisiert auf deine Frage.",
    "",
    `Frage: „${q.length > 140 ? q.slice(0, 140) + "…" : q}"`,
    "",
    "Aktuell ist nur eine Demo aktiv — keine echte Wissensbasis verbunden, keine Speicherung der Anfrage.",
  ].join("\n");
}

export function RgbWissenClient() {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, startTransition] = useTransition();

  function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 5) return;
    startTransition(() => {
      // Künstliche Verzögerung damit das UI nicht "schnellt"
      setTimeout(() => {
        setTurns((prev) => [
          {
            id: crypto.randomUUID(),
            question: trimmed,
            answer: mockAnswer(trimmed),
            at: new Date(),
          },
          ...prev,
        ]);
        setText("");
      }, 350);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(text);
  }

  return (
    <section className="pb-10">
      <form onSubmit={onSubmit} className="max-w-3xl">
        <label
          htmlFor="rgb-question"
          className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]"
        >
          Frage an die RGB-Wissensdatenbank
        </label>
        <textarea
          id="rgb-question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="z. B. Wie läuft die Nachtrags-Freigabe im RGB-System?"
          rows={3}
          disabled={pending}
          className="mt-2 w-full resize-y border border-[color:var(--color-border)] bg-[color:var(--color-bg)] rounded-md p-3 text-sm leading-relaxed focus:outline-none focus:border-[color:var(--color-accent)] disabled:opacity-60"
        />
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Eingabe wird nicht gespeichert
          </span>
          <button
            type="submit"
            disabled={pending || text.trim().length < 5}
            className="border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)] rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {pending ? "Sucht…" : "Frage stellen"}
          </button>
        </div>
      </form>

      <div className="mt-6 max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Beispielfragen
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => setText(q)}
                disabled={pending}
                className="text-left text-xs border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] hover:border-[color:var(--color-accent)] rounded-sm px-2 py-1 disabled:opacity-50 transition-colors"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {turns.length > 0 && (
        <div className="mt-10 max-w-3xl space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Verlauf (nur in dieser Sitzung, {turns.length})
          </p>
          {turns.map((t) => (
            <article
              key={t.id}
              className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] rounded-md p-4"
            >
              <p className="text-sm font-medium leading-relaxed">{t.question}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
                {t.at.toLocaleTimeString("de-DE")}
              </p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[color:var(--color-fg)]">
                {t.answer}
              </pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
