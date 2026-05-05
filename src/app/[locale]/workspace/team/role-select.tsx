"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import {
  MEMBER_ROLE_META,
  MEMBER_ROLE_ORDER,
} from "@/lib/auth/member-role-meta";
import type { MemberRole } from "@/db/schema";
import { updateMemberRole } from "./actions";

export function RoleSelect({
  userId,
  currentRole,
  disabled = false,
}: {
  userId: string;
  currentRole: MemberRole;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as MemberRole;
    if (next === currentRole) return;
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", next);
    startTransition(async () => {
      const result = await updateMemberRole(null, fd);
      if (result.ok) {
        push({
          tone: "success",
          title: "Rolle aktualisiert",
          body: `Neue Rolle: ${MEMBER_ROLE_META[result.data.role].label}.`,
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
    <select
      defaultValue={currentRole}
      onChange={onChange}
      disabled={disabled || pending}
      className="bg-transparent border border-[color:var(--color-border)] rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-[color:var(--color-accent)] disabled:opacity-60"
    >
      {MEMBER_ROLE_ORDER.map((role) => (
        <option key={role} value={role}>
          {MEMBER_ROLE_META[role].label}
        </option>
      ))}
    </select>
  );
}
