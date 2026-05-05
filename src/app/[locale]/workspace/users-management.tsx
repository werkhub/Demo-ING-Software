"use client";

import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";

type WUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  lastLogin: string;
  projects: number;
  license: boolean;
  leaving: boolean;
};

const USERS: WUser[] = [
  { id: "U01", name: "Thomas Müller", email: "t.mueller@muellerbau.de", role: "admin", roleLabel: "Admin · Geschäftsleitung", lastLogin: "vor 5 Min.", projects: 3, license: true, leaving: false },
  { id: "U02", name: "Klaus Schmidt", email: "k.schmidt@muellerbau.de", role: "user", roleLabel: "Bauleiter", lastLogin: "vor 2 Std.", projects: 1, license: true, leaving: false },
  { id: "U03", name: "Maria Vogel", email: "m.vogel@muellerbau.de", role: "user", roleLabel: "Bauleiterin", lastLogin: "gestern", projects: 1, license: true, leaving: false },
  { id: "U04", name: "Andreas Krüger", email: "a.krueger@muellerbau.de", role: "user", roleLabel: "Bauleiter", lastLogin: "vor 4 Std.", projects: 1, license: true, leaving: false },
  { id: "U05", name: "Stefan Hofmann", email: "s.hofmann@muellerbau.de", role: "user", roleLabel: "Junior-Bauleiter", lastLogin: "vor 1 Std.", projects: 1, license: true, leaving: false },
  { id: "U06", name: "Petra Lang", email: "p.lang@muellerbau.de", role: "user", roleLabel: "Projektleitung", lastLogin: "vor 30 Min.", projects: 2, license: true, leaving: false },
  { id: "U07", name: "Anna Bauer", email: "a.bauer@muellerbau.de", role: "viewer", roleLabel: "Office-Management", lastLogin: "gestern", projects: 0, license: true, leaving: false },
  { id: "U08", name: "Jens Becker", email: "j.becker@muellerbau.de", role: "user", roleLabel: "Bauleiter · WECHSEL ZUM 31.05.2026", lastLogin: "vor 2 Tagen", projects: 1, license: true, leaving: true },
];

export function UsersManagement() {
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showWechsel, setShowWechsel] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return USERS;
    const s = search.toLowerCase();
    return USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.roleLabel.toLowerCase().includes(s)
    );
  }, [search]);

  const used = USERS.filter((u) => u.license).length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(inviteEmail)) return;
    setShowInvite(false);
    showToast(`Einladung an ${inviteEmail} versendet (Mock — echtes Mailing folgt mit Auth-Anbindung).`);
    setInviteEmail("");
    setInviteRole("user");
  }

  function startWechsel() {
    setShowWechsel(false);
    showToast("Wechsel-Workflow gestartet — Lizenz wird zum 31.05.2026 freigegeben, Daten archiviert.");
  }

  return (
    <>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Verwaltung · Müller Bau GmbH
        </p>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">Workspace</h1>
            <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
              Mitarbeiter, Rollen und Lizenz-Status verwalten.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/workspace/team"
              className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 py-2 transition-colors"
            >
              Rollen &amp; Permissions →
            </Link>
            <Link
              href="/lizenz"
              className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 py-2 transition-colors"
            >
              Lizenz-Center →
            </Link>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Mitarbeiter einladen <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              User aktiv
            </p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight">{used}</span>
              <span className="text-sm text-[color:var(--color-fg-muted)]">/ 12</span>
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">Tarif</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Team</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              89 €/User/Monat
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">Monat</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">712 €</p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">VOB-Lizenz</p>
            <p className="mt-3 text-sm font-medium text-[color:var(--color-success)]">aktiv bis 31.03.2027</p>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Mitarbeiter-Wechsel anstehend
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            <strong className="text-[color:var(--color-fg)] font-medium">Jens Becker</strong> verlässt das
            Unternehmen zum <strong className="text-[color:var(--color-fg)] font-medium">31.05.2026</strong>.
            Workflow zur Lizenz-Übertragung und Daten-Archivierung verfügbar.
          </p>
          <button
            type="button"
            onClick={() => setShowWechsel(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Wechsel-Workflow starten <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      <section className="pb-16">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-semibold tracking-tight">
            Mitarbeiter ({filtered.length}{search ? ` von ${USERS.length}` : ""})
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche…"
            className="bg-[color:var(--color-bg-subtle)] border border-transparent rounded-full px-4 py-1.5 text-xs text-[color:var(--color-fg)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-border)] focus:outline-none w-44"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            Keine Mitarbeiter passen zu „{search}“.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {filtered.map((u) => {
              const initials = u.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");
              return (
                <li key={u.id} className="py-5 flex items-center gap-5">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] grid place-items-center text-xs font-mono font-semibold text-[color:var(--color-fg-muted)] shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{u.name}</span>
                      {u.leaving && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-1.5 py-0.5">
                          Verlässt
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[color:var(--color-fg-muted)] mt-1 truncate">
                      {u.email} · {u.roleLabel}
                    </div>
                  </div>
                  <div className="hidden md:block text-right shrink-0 w-32">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      {u.role}
                    </div>
                  </div>
                  <div className="hidden md:block text-right text-xs text-[color:var(--color-fg-muted)] shrink-0 w-28">
                    <div>{u.lastLogin}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] mt-1">
                      {u.projects} Projekt{u.projects === 1 ? "" : "e"}
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    {u.license ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-success)]">
                        Lizenz
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        Gast
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Status
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Mock-Daten zur Veranschaulichung des Workspace-Modells. Echte
            User-Verwaltung mit Auth (Clerk oder Auth.js) folgt in Phase 3.
          </p>
        </div>
      </section>

      {showInvite && (
        <Modal title="Mitarbeiter einladen" onClose={() => setShowInvite(false)}>
          <form onSubmit={submitInvite} className="space-y-5">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="vorname.nachname@muellerbau.de"
                className="w-full bg-transparent border-b border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] py-2.5 text-base focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2">
                Rolle
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-transparent border-b border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] py-2.5 text-base focus:outline-none transition-colors"
              >
                <option value="user">Bauleiter / User</option>
                <option value="viewer">Office / Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <p className="text-[11px] text-[color:var(--color-fg-muted)]">
              Eine Lizenz wird automatisch zugeordnet. Aktuell {used} von 12 belegt.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                Einladung senden
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showWechsel && (
        <Modal title="Wechsel-Workflow · Jens Becker" onClose={() => setShowWechsel(false)}>
          <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
            Der Workflow erledigt für dich:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-[color:var(--color-success)]">✓</span>
              Sperrung des Logins zum 31.05.2026
            </li>
            <li className="flex gap-2">
              <span className="text-[color:var(--color-success)]">✓</span>
              Übertrag der Projekt-Verantwortung auf gewählten Nachfolger
            </li>
            <li className="flex gap-2">
              <span className="text-[color:var(--color-success)]">✓</span>
              Archivierung des Bautagebuch-Verlaufs (revisionssicher, 10 Jahre)
            </li>
            <li className="flex gap-2">
              <span className="text-[color:var(--color-success)]">✓</span>
              Freigabe der VOB-Lizenz für neuen Mitarbeiter
            </li>
            <li className="flex gap-2">
              <span className="text-[color:var(--color-success)]">✓</span>
              Schluss-Zusammenfassung als PDF an Geschäftsleitung
            </li>
          </ul>
          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-[color:var(--color-border)]">
            <button
              type="button"
              onClick={() => setShowWechsel(false)}
              className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={startWechsel}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Workflow starten →
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[color:var(--color-fg)] text-[color:var(--color-bg)] rounded-md shadow-lg px-5 py-3.5 text-sm">
          {toast}
        </div>
      )}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md max-w-lg w-full p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            ✕ Schließen
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
