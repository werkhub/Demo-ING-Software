"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavSection } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoMark } from "./logo-mark";
import { NavIcon } from "./nav-icon";
import { useSidebar } from "./sidebar-context";

const badgeColorClasses: Record<string, string> = {
  emerald:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  violet:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  amber:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  red:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  indigo:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
};

const COLLAPSED_STORAGE_KEY = "lexbau:sidebar:collapsedSections";

export function Sidebar({
  workspaceName,
  nav,
  roleShortLabel,
  roleLabel,
}: {
  workspaceName?: string;
  nav: NavSection[];
  roleShortLabel?: string;
  roleLabel?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { open, setOpen } = useSidebar();

  // Server-Render: alle expanded (kein localStorage-Zugriff → kein Hydration-Mismatch).
  // Nach Mount: gespeicherten Zustand laden.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as unknown;
        if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
          setCollapsed(new Set(arr));
        }
      }
    } catch {
      // localStorage gesperrt (Safari Private etc.) → Default beibehalten
    }
  }, []);

  function toggleSection(slug: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      try {
        window.localStorage.setItem(
          COLLAPSED_STORAGE_KEY,
          JSON.stringify([...next])
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  if (pathname === "/login") return null;
  // Public-Hinweisgeber-Routen sind ohne Sidebar (anonyme Besucher).
  if (pathname.startsWith("/hinweis")) return null;
  // Public-Aufmaß-Prüfer-Routen ebenso (externe Prüfer ohne Account).
  if (pathname.startsWith("/aufmass-pruefen")) return null;

  function isItemActive(item: NavSection["items"][number]): boolean {
    if (item.id === "dashboard") {
      return pathname === "/" || pathname.startsWith("/dashboard");
    }
    if (item.href === "/") return pathname === "/";
    if (item.activePathPrefixes && item.activePathPrefixes.length > 0) {
      return item.activePathPrefixes.some((p) => pathname.startsWith(p));
    }
    return pathname.startsWith(item.href);
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <aside
        aria-label={t("ariaLabel")}
        className={cn(
          "w-64 shrink-0 bg-[color:var(--color-bg-subtle)] border-r border-[color:var(--color-border)] min-h-screen flex flex-col z-50",
          "fixed inset-y-0 left-0 transform transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-[color:var(--color-border)]">
          <Link href="/" className="flex items-center gap-2.5 group flex-1 min-w-0">
            <LogoMark className="text-[color:var(--color-accent)] transition-transform group-hover:rotate-3" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-tight text-[color:var(--color-fg)] leading-none flex items-center gap-1.5">
                LexBau
                {roleShortLabel ? (
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-accent-border,var(--color-border))] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-sm px-1 py-0.5"
                    title={roleLabel}
                  >
                    {roleShortLabel}
                  </span>
                ) : null}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1 truncate">
                {roleLabel ?? t("tagline")}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeAria")}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="px-3 py-5 space-y-0.5 flex-1 overflow-y-auto scrollbar-thin">
          {nav.map((section) => {
            const isCollapsed = collapsed.has(section.slug);
            const sectionHasActive = section.items.some(isItemActive);
            const contentId = `nav-section-${section.slug}`;
            return (
              <div key={section.slug} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section.slug)}
                  aria-expanded={!isCollapsed}
                  aria-controls={contentId}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 pt-4 pb-2 first:pt-0",
                    "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]",
                    "hover:text-[color:var(--color-fg)] transition-colors cursor-pointer select-none"
                  )}
                  title={isCollapsed ? section.title + " einblenden" : section.title + " ausblenden"}
                >
                  <span className="flex items-center gap-1.5">
                    {section.title}
                    {isCollapsed && sectionHasActive ? (
                      <span
                        aria-hidden
                        className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent)]"
                        title="Aktive Seite in dieser Sektion"
                      />
                    ) : null}
                  </span>
                  <ChevronDown
                    size={12}
                    className={cn(
                      "transition-transform duration-200 opacity-60",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      key="content"
                      id={contentId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const isActive = isItemActive(item);
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                                isActive
                                  ? "text-[color:var(--color-fg)] font-medium"
                                  : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
                              )}
                            >
                              {isActive && (
                                <motion.span
                                  layoutId="sidebar-active"
                                  className="absolute inset-0 rounded-md bg-[color:var(--color-bg)] border border-[color:var(--color-border)]"
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ zIndex: -1 }}
                                />
                              )}
                              <span className="relative w-5 grid place-items-center opacity-80">
                                <NavIcon name={item.icon} size={15} />
                              </span>
                              <span className="relative flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "relative font-mono text-[9px] uppercase tracking-wider rounded-full border px-1.5 py-0.5 font-semibold",
                                    badgeColorClasses[item.badge.color]
                                  )}
                                >
                                  {item.badge.text}
                                </span>
                              )}
                              {item.count !== undefined && (
                                <span className="relative font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                                  {item.count}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
