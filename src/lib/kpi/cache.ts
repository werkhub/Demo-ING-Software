/**
 * In-Process-KPI-Cache, TTL 5 Minuten.
 *
 * KPIs sind cross-domain-Aggregate über mehrere Tabellen. Bei jedem
 * GF-Dashboard-Request alle 6 KPIs neu zu rechnen ist teuer; das Modul hier
 * cached pro Workspace + KPI-Name + Tag.
 *
 * Bewusst keine Disk-Persistierung — nach Restart leer, das ist OK.
 * Multi-Tenant-sicher: Workspace-ID ist immer Teil des Keys.
 */

const TTL_MS = 5 * 60 * 1000;

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function kpiKey(workspaceId: string, name: string): string {
  return `${workspaceId}:${name}:${todayStamp()}`;
}

export function getCached<T>(key: string): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() > e.expires) {
    store.delete(key);
    return null;
  }
  return e.value;
}

export function setCached<T>(key: string, value: T): T {
  store.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

export async function withCache<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;
  const fresh = await loader();
  setCached(key, fresh);
  return fresh;
}

export function clearKpiCache(): void {
  store.clear();
}
