"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
} from "@/lib/auth/permissions-keys";
import {
  MEMBER_ROLE_META,
  MEMBER_ROLE_ORDER,
} from "@/lib/auth/member-role-meta";
import type {
  MemberRole,
  PermissionAction,
  PermissionResource,
} from "@/db/schema";
import { setMatrixCell } from "./actions";

type CellKey = `${MemberRole}:${PermissionResource}:${PermissionAction}`;

function ck(
  role: MemberRole,
  resource: PermissionResource,
  action: PermissionAction
): CellKey {
  return `${role}:${resource}:${action}`;
}

const RESOURCE_LABEL: Record<PermissionResource, string> = {
  team: "Team",
  permissions: "Permissions-Matrix",
  projekte: "Projekte",
  vorgaenge: "Vorgänge",
  bautagebuch: "Bautagebuch",
  maengel: "Mängel",
  plaene: "Pläne",
  geraete: "Geräte",
  stunden: "Stunden",
  lv: "LV",
  aufmass: "Aufmaß",
  ausgangsrechnungen: "Ausgangsrechnungen",
  mahnungen: "Mahnungen",
  eingangsrechnungen: "Eingangsrechnungen",
  nachkalk: "Nachkalkulation",
  datev: "DATEV-Export",
  finanzen: "Finanzen",
};

export function MatrixEditor({
  initial,
  defaults,
}: {
  /** Effektiver Wert (DB-Eintrag, sonst Default) je Zelle. */
  initial: Record<CellKey, boolean>;
  /** Reine Default-Werte ohne DB-Override — für Visualisierung. */
  defaults: Record<CellKey, boolean>;
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function toggle(
    role: MemberRole,
    resource: PermissionResource,
    action: PermissionAction,
    next: boolean
  ) {
    const fd = new FormData();
    fd.set("role", role);
    fd.set("resource", resource);
    fd.set("action", action);
    fd.set("allowed", next ? "true" : "false");
    startTransition(async () => {
      const result = await setMatrixCell(null, fd);
      if (result.ok) {
        push({
          tone: "success",
          title: "Matrix gespeichert",
          body: `${MEMBER_ROLE_META[role].label} · ${RESOURCE_LABEL[resource]} · ${action} = ${next ? "erlaubt" : "verweigert"}.`,
        });
      } else {
        push({
          tone: "critical",
          title: "Speichern fehlgeschlagen",
          body: result.formError ?? "Unbekannter Fehler.",
        });
      }
    });
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--color-border)]">
            <th className="text-left py-3 px-3 font-medium text-[color:var(--color-fg-muted)] sticky left-0 bg-[color:var(--color-bg)] z-10">
              Resource
            </th>
            <th className="py-3 px-2 font-medium text-[color:var(--color-fg-muted)] text-xs">
              Action
            </th>
            {MEMBER_ROLE_ORDER.map((role) => (
              <th
                key={role}
                className="py-3 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-center"
              >
                {MEMBER_ROLE_META[role].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_RESOURCES.map((resource) => (
            <ResourceRows
              key={resource}
              resource={resource}
              initial={initial}
              defaults={defaults}
              pending={pending}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourceRows({
  resource,
  initial,
  defaults,
  pending,
  onToggle,
}: {
  resource: PermissionResource;
  initial: Record<CellKey, boolean>;
  defaults: Record<CellKey, boolean>;
  pending: boolean;
  onToggle: (
    role: MemberRole,
    resource: PermissionResource,
    action: PermissionAction,
    next: boolean
  ) => void;
}) {
  return (
    <>
      {PERMISSION_ACTIONS.map((action, idx) => (
        <tr
          key={`${resource}-${action}`}
          className={
            idx === 0
              ? "border-t border-[color:var(--color-border)]"
              : ""
          }
        >
          {idx === 0 ? (
            <td
              rowSpan={PERMISSION_ACTIONS.length}
              className="align-top py-3 px-3 text-sm font-medium sticky left-0 bg-[color:var(--color-bg)] z-10 border-r border-[color:var(--color-border)]"
            >
              {RESOURCE_LABEL[resource]}
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
                {resource}
              </div>
            </td>
          ) : null}
          <td className="py-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-center">
            {action}
          </td>
          {MEMBER_ROLE_ORDER.map((role) => {
            const key = ck(role, resource, action);
            const checked = initial[key] ?? false;
            const isCustom = checked !== (defaults[key] ?? false);
            return (
              <td key={role} className="py-2 px-2 text-center">
                <label
                  className={`inline-flex items-center justify-center w-7 h-7 rounded border ${
                    isCustom
                      ? "border-[color:var(--color-accent)]"
                      : "border-[color:var(--color-border)]"
                  } hover:bg-[color:var(--color-bg-subtle)] cursor-pointer`}
                  title={
                    isCustom
                      ? "Workspace-Override (Default abweichend)"
                      : "Default-Wert"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={(e) =>
                      onToggle(role, resource, action, e.target.checked)
                    }
                    className="accent-[color:var(--color-accent)]"
                  />
                </label>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
