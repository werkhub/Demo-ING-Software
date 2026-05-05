import { Link } from "@/i18n/navigation";

export type TabSpec<TKey extends string> = {
  key: TKey;
  label: string;
  count?: number;
};

/**
 * Wiederverwendbare horizontale Tab-Navigation auf Basis von URL-Search-Params.
 * Server-Component-fähig. Aktiver Tab wird über `?tab=<key>` gesteuert; der
 * erste Tab in der Liste wird dargestellt, wenn der Param fehlt.
 *
 * @param baseHref   Basis-URL der Detailseite (z. B. /vorgaenge/:id)
 * @param defaultKey Tab, der ohne ?tab= aktiv ist — auf diesen Tab wird
 *                   nicht ?tab= im Link gesetzt, damit URLs sauber bleiben
 */
export function TabNav<TKey extends string>({
  tabs,
  active,
  baseHref,
  defaultKey,
}: {
  tabs: readonly TabSpec<TKey>[];
  active: TKey;
  baseHref: string;
  defaultKey: TKey;
}) {
  return (
    <nav className="border-b border-[color:var(--color-border)] -mx-4 md:mx-0 overflow-x-auto">
      <ul className="flex items-stretch gap-px min-w-max md:min-w-0 px-4 md:px-0">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const href =
            tab.key === defaultKey ? baseHref : `${baseHref}?tab=${tab.key}`;
          return (
            <li key={tab.key} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-[color:var(--color-accent)] text-[color:var(--color-fg)] font-medium"
                    : "border-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 ? (
                  <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)] bg-[color:var(--color-bg-subtle)] rounded-sm px-1.5">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Helper: extrahiert einen Tab-Key aus den Search-Params, mit Fallback auf den
 * Default-Key. Gibt eine type-safe Garantie, dass der zurückgegebene Wert
 * tatsächlich einer der erlaubten Keys ist.
 */
export function resolveTabKey<TKey extends string>(
  raw: string | string[] | undefined,
  allowed: readonly TKey[],
  defaultKey: TKey
): TKey {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (candidate && (allowed as readonly string[]).includes(candidate)) {
    return candidate as TKey;
  }
  return defaultKey;
}
