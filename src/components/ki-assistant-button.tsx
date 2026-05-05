"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { askKiAssistant, type KiAssistantResponse } from "@/lib/ki-assistent/actions";
import {
  fillPromptTemplate,
  type SamplePrompt,
} from "@/lib/ki-assistent/sample-prompts";
import type { Locale } from "@/lib/ki-assistent/feature-index";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export type KiAssistantButtonProps = {
  /** Vorausgewählter Projektname für Prompt-Templates (z. B. erstes aktives Projekt). */
  projectNameForPrompts: string | null;
  samplePrompts: readonly SamplePrompt[];
  /** UI-Locale — steuert Drawer-Header, Composer-Texte und Prompt-Befüllung. */
  locale: Locale;
};

type UiText = {
  buttonLabel: string;
  buttonTitle: string;
  closeLabel: string;
  drawerTitle: string;
  drawerSubtitle: string;
  emptyHeader: string;
  emptyBody: string;
  examplesLabel: string;
  composerPlaceholder: string;
  composerHint: string;
  loading: string;
  answerLabel: string;
  sendLabel: string;
};

const UI_TEXTS: Record<Locale, UiText> = {
  de: {
    buttonLabel: "KI-Assistent",
    buttonTitle:
      "KI-Assistent (gibt Auskunft über alle Projekte und Daten)",
    closeLabel: "Schließen",
    drawerTitle: "KI-Assistent",
    drawerSubtitle: "Schnellauskunft über alle Projekte",
    emptyHeader: "Was kann ich tun?",
    emptyBody:
      "Ich greife in Sekunden auf alle Projekte, Vorgänge, Fristen und Rechnungen dieses Workspaces zu und kann auch Hinweise geben, wo bestimmte Funktionen liegen.",
    examplesLabel: "Beispiele",
    composerPlaceholder:
      'Frage stellen — z. B. "Wo finde ich Vorgänge?" oder "Wie viel ist abgerechnet?"',
    composerHint:
      "Enter zum Senden · Shift+Enter für Zeilenumbruch · Daten werden nicht außerhalb dieses Workspaces verschickt.",
    loading: "Antwort wird zusammengestellt …",
    answerLabel: "Antwort",
    sendLabel: "Senden",
  },
  en: {
    buttonLabel: "AI assistant",
    buttonTitle: "AI assistant (queries all projects and data)",
    closeLabel: "Close",
    drawerTitle: "AI assistant",
    drawerSubtitle: "Quick lookup across all projects",
    emptyHeader: "What can I do?",
    emptyBody:
      "I query all projects, cases, deadlines and invoices of this workspace in seconds, and I can also tell you where to find specific features.",
    examplesLabel: "Examples",
    composerPlaceholder:
      'Ask a question — e.g. "Where do I find cases?" or "How much has been billed?"',
    composerHint:
      "Enter to send · Shift+Enter for a new line · Data does not leave this workspace.",
    loading: "Composing answer …",
    answerLabel: "Answer",
    sendLabel: "Send",
  },
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function KiAssistantButton({
  projectNameForPrompts,
  samplePrompts,
  locale,
}: KiAssistantButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ui = UI_TEXTS[locale];

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function send(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 3 || isPending) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    startTransition(async () => {
      const result: ActionResult<KiAssistantResponse> =
        await askKiAssistant(trimmed);
      if (!result.ok) {
        setError(result.formError ?? "Unbekannter Fehler.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.data.markdown },
      ]);
    });
  }

  return (
    <>
      {/* Floating Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ui.buttonTitle}
        title={ui.buttonTitle}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "inline-flex items-center gap-2 rounded-full",
          "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]",
          "px-5 py-3 shadow-lg",
          "hover:bg-[color:var(--color-accent)] hover:text-white",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:ring-offset-2",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <Sparkles size={18} aria-hidden />
        <span className="text-sm font-medium">{ui.buttonLabel}</span>
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={ui.drawerTitle}
        aria-modal="true"
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px]",
          "bg-[color:var(--color-bg)] border-l border-[color:var(--color-border)]",
          "flex flex-col",
          "transform transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 h-16 border-b border-[color:var(--color-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles
              size={16}
              className="text-[color:var(--color-accent)] shrink-0"
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none">
                {ui.drawerTitle}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
                {ui.drawerSubtitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={ui.closeLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-5">
          {messages.length === 0 ? (
            <EmptyState
              prompts={samplePrompts}
              projectName={projectNameForPrompts}
              locale={locale}
              ui={ui}
              onPick={send}
            />
          ) : (
            <>
              {messages.map((m, idx) => (
                <MessageBubble
                  key={idx}
                  role={m.role}
                  content={m.content}
                  answerLabel={ui.answerLabel}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              {isPending && (
                <div className="flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)]">
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  <span>{ui.loading}</span>
                </div>
              )}
            </>
          )}
          {error && (
            <div className="rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-3 py-2 text-xs text-[color:var(--color-critical)]">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <footer className="border-t border-[color:var(--color-border)] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={ui.composerPlaceholder}
              rows={2}
              maxLength={2000}
              className={cn(
                "flex-1 resize-none rounded-md border border-[color:var(--color-border)]",
                "bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)]",
                "focus:outline-none focus:border-[color:var(--color-accent)]"
              )}
            />
            <button
              type="submit"
              disabled={isPending || input.trim().length < 3}
              aria-label={ui.sendLabel}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full",
                "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]",
                "hover:bg-[color:var(--color-accent)] hover:text-white",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Send size={14} aria-hidden />
              )}
            </button>
          </form>
          <p className="mt-2 text-[10px] text-[color:var(--color-fg-muted)] leading-relaxed">
            {ui.composerHint}
          </p>
        </footer>
      </aside>
    </>
  );
}

function EmptyState({
  prompts,
  projectName,
  locale,
  ui,
  onPick,
}: {
  prompts: readonly SamplePrompt[];
  projectName: string | null;
  locale: Locale;
  ui: UiText;
  onPick: (filled: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
          {ui.emptyHeader}
        </p>
        <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
          {ui.emptyBody}
        </p>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-2">
          {ui.examplesLabel}
        </p>
        <div className="grid gap-2">
          {prompts.map((p) => {
            const filled = fillPromptTemplate(p.template, projectName, locale);
            const labelFilled = fillPromptTemplate(p.label, projectName, locale);
            const kindBadge =
              p.kind === "navigation"
                ? locale === "en"
                  ? "Navigate"
                  : "Wegweiser"
                : p.kind === "howto"
                  ? locale === "en"
                    ? "How-to"
                    : "Anleitung"
                  : null;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onPick(filled)}
                className={cn(
                  "text-left rounded-md border border-[color:var(--color-border)]",
                  "bg-[color:var(--color-bg)] px-3 py-2.5 text-xs",
                  "hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-bg-subtle)]",
                  "transition-colors flex items-start gap-2"
                )}
              >
                <span className="flex-1">{labelFilled}</span>
                {kindBadge ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-fg-muted)] shrink-0 mt-0.5">
                    {kindBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  answerLabel,
  onNavigate,
}: {
  role: "user" | "assistant";
  content: string;
  answerLabel: string;
  onNavigate: () => void;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md bg-[color:var(--color-accent-soft)] border border-[color:var(--color-accent-border,var(--color-border))] px-3 py-2 text-sm text-[color:var(--color-fg)]">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] mb-2">
        {answerLabel}
      </p>
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-sm text-[color:var(--color-fg)] leading-relaxed">
        <MiniMarkdown source={content} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * Minimaler Markdown-Renderer — bewusst klein gehalten, keine externe Lib.
 * Unterstützt: **bold**, _italic_, [text](href)-Links (intern via Next-Link
 * mit Drawer-Close, extern in neuem Tab), Listen mit `· ` oder `- `, `---`
 * als horizontaler Trenner.
 */
function MiniMarkdown({
  source,
  onNavigate,
}: {
  source: string;
  onNavigate: () => void;
}): ReactNode {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        // Trenner
        if (block.trim() === "---") {
          return (
            <hr
              key={i}
              className="border-[color:var(--color-border)]"
              aria-hidden
            />
          );
        }
        // Liste, wenn alle nicht-leeren Zeilen mit · oder - beginnen
        const isList =
          lines.length > 0 &&
          lines.every((l) => /^[·\-]\s/.test(l.trim()) || l.trim() === "");
        if (isList) {
          const items = lines
            .filter((l) => l.trim().length > 0)
            .map((l) => l.replace(/^[·\-]\s+/, ""));
          return (
            <ul key={i} className="list-none space-y-1.5">
              {items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span
                    className="text-[color:var(--color-accent)] shrink-0"
                    aria-hidden
                  >
                    ·
                  </span>
                  <span className="flex-1">{renderInline(it, onNavigate)}</span>
                </li>
              ))}
            </ul>
          );
        }
        // Nummerierte Liste (1. … 2. …)
        const isOrdered =
          lines.length > 0 &&
          lines.every((l) => /^\d+\.\s/.test(l.trim()) || l.trim() === "");
        if (isOrdered) {
          const items = lines
            .filter((l) => l.trim().length > 0)
            .map((l) => l.replace(/^\d+\.\s+/, ""));
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1.5 marker:text-[color:var(--color-fg-muted)]">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it, onNavigate)}</li>
              ))}
            </ol>
          );
        }
        // Normaler Absatz: Zeilen mit <br/> verbinden
        return (
          <p key={i} className="leading-relaxed">
            {lines.map((l, j) => (
              <span key={j}>
                {renderInline(l, onNavigate)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline-Markdown: **bold**, _italic_, [text](href). Reihenfolge der Pattern
 * im RegExp ist wichtig — Links zuerst, damit die Klammern in `[text](href)`
 * nicht von späteren Pattern verschluckt werden.
 *
 * Sicherheits-Hinweis: nur `/`-Pfade und `https?://`-URLs werden gerendert,
 * `javascript:` etc. wird als Klartext durchgereicht.
 */
function renderInline(text: string, onNavigate: () => void): ReactNode {
  const parts: ReactNode[] = [];
  const re =
    /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      // Link
      const linkText = match[1];
      const href = match[2];
      parts.push(renderLink(linkText, href, onNavigate, `l${key++}`));
    } else if (match[3] !== undefined) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold">
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <em key={`i${key++}`} className="italic">
          {match[4]}
        </em>
      );
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return <>{parts}</>;
}

function renderLink(
  text: string,
  href: string,
  onNavigate: () => void,
  key: string
): ReactNode {
  const linkClass =
    "underline decoration-[color:var(--color-accent)] underline-offset-2 hover:text-[color:var(--color-accent)] transition-colors";
  // Interner Pfad — Next-Link, der den Drawer schließt
  if (href.startsWith("/")) {
    return (
      <Link
        key={key}
        href={href}
        onClick={onNavigate}
        className={linkClass}
      >
        {text}
      </Link>
    );
  }
  // Externer http(s)-Link
  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {text}
      </a>
    );
  }
  // Alles andere (javascript:, mailto: usw.) als Klartext durchreichen.
  return <span key={key}>{text}</span>;
}
