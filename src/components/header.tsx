"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Bell, Menu } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";

const NOTIFICATIONS = [
  {
    id: "n1",
    type: "critical",
    title: "BHA-Frist morgen",
    body: "TGA-Pläne BV-2024-014 — Behinderungsanzeige erforderlich.",
    when: "vor 12 Min.",
  },
  {
    id: "n2",
    type: "warning",
    title: "Mangelrüge eingegangen",
    body: "Stadt Lüdenscheid · Putz-Risse Treppenhaus 1.OG.",
    when: "vor 2 Std.",
  },
  {
    id: "n3",
    type: "info",
    title: "Bautagebuch-Trigger",
    body: "Eintrag von K. Schmidt enthält Anordnungs-Wortlaut.",
    when: "gestern",
  },
];

export function Header({ userMenu }: { userMenu?: React.ReactNode }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { toggle: toggleSidebar } = useSidebar();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowBell(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (pathname === "/login") return null;
  if (pathname.startsWith("/hinweis")) return null;
  if (pathname.startsWith("/aufmass-pruefen")) return null;

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-colors",
        scrolled
          ? "border-[color:var(--color-border)] bg-[color:var(--color-bg)]/85"
          : "border-transparent bg-[color:var(--color-bg)]/0"
      )}
    >
      <div className="flex h-16 items-center gap-3 md:gap-6 px-4 md:px-8">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Navigation öffnen"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors shrink-0"
        >
          <Menu size={16} />
        </button>
        <GlobalSearch />

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setShowBell((s) => !s)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:border-[color:var(--color-fg)]/30 transition-colors"
              aria-label="Benachrichtigungen (Demo)"
            >
              <Bell size={15} />
            </button>
            {showBell && (
              <div className="absolute right-0 mt-2 w-80 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md shadow-lg p-4 z-50">
                <div className="flex items-baseline justify-between mb-3 gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                    Benachrichtigungen
                  </p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-1.5 py-0.5">
                    Demo
                  </span>
                </div>
                <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed mb-3">
                  Beispiel-Benachrichtigungen aus Mock-Daten. Die echte Verknüpfung
                  zu Fristen und Bautagebuch-Triggern folgt mit Phase 1 (Claude-API).
                </p>
                <ul className="space-y-3">
                  {NOTIFICATIONS.map((n) => (
                    <li
                      key={n.id}
                      className="border-l-2 pl-3 py-1"
                      style={{
                        borderColor:
                          n.type === "critical"
                            ? "var(--color-critical)"
                            : n.type === "warning"
                              ? "var(--color-warning)"
                              : "var(--color-fg-muted)",
                      }}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
                        {n.when}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {userMenu}
        </div>
      </div>
    </motion.header>
  );
}
