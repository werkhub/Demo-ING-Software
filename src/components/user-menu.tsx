"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/[locale]/login/actions";

type Props = {
  name: string;
  email: string;
  workspaceLabel?: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ name, email, workspaceLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative ml-2 pl-3 border-l border-[color:var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3"
      >
        <div className="text-sm leading-tight text-right hidden md:block">
          <div className="font-semibold text-[color:var(--color-fg)]">{name}</div>
          {workspaceLabel ? (
            <div className="text-[11px] text-[color:var(--color-fg-muted)]">
              {workspaceLabel}
            </div>
          ) : null}
        </div>
        <div className="h-8 w-8 rounded-full bg-[color:var(--color-accent)] grid place-items-center text-white text-xs font-semibold">
          {initials(name)}
        </div>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md shadow-lg p-3 z-50"
        >
          <p className="px-1 text-sm font-medium text-[color:var(--color-fg)]">
            {name}
          </p>
          <p className="px-1 text-xs text-[color:var(--color-fg-muted)] truncate">
            {email}
          </p>
          {workspaceLabel ? (
            <p className="px-1 mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {workspaceLabel}
            </p>
          ) : null}
          <hr className="my-3 border-[color:var(--color-border)]" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-subtle)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              <LogOut size={14} aria-hidden /> Abmelden
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
