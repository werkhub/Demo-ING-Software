import { Link } from "@/i18n/navigation";
import type { AuditEntityType } from "@/db/schema";

/**
 * Kompakter Link von einer Detail-Seite ins Audit-Log, gefiltert auf die
 * aktuelle Entity. Wird in Vorgangs-/Projekt-/Abnahme-/Sicherheits-Detail-
 * Views eingebunden.
 *
 * Nicht-Admins sehen den Link auch — die Audit-Seite redirected sie selbst,
 * der Link bleibt ein „toter" Hinweis. Das ist bewusst: Die Existenz des
 * Audit-Logs darf bekannt sein.
 */
export function AuditHistoryLink({
  entityType,
  entityId,
  className,
}: {
  entityType: AuditEntityType;
  entityId: string;
  className?: string;
}) {
  const href = `/audit?entity_type=${encodeURIComponent(
    entityType
  )}&entity_id=${encodeURIComponent(entityId)}`;
  return (
    <Link
      href={href}
      className={
        className ??
        "text-xs text-[color:var(--color-muted-foreground)] underline hover:text-[color:var(--color-foreground)]"
      }
    >
      &Auml;nderungs-Historie
    </Link>
  );
}
