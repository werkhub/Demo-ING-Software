import { TabNav, type TabSpec } from "@/components/ui/tab-nav";

export type VorgangTabKey =
  | "uebersicht"
  | "dokumente"
  | "analyse"
  | "empfehlung"
  | "entwurf"
  | "verknuepfungen"
  | "verlauf";

export const VORGANG_TAB_KEYS: readonly VorgangTabKey[] = [
  "uebersicht",
  "dokumente",
  "analyse",
  "empfehlung",
  "entwurf",
  "verknuepfungen",
  "verlauf",
];

const TAB_LABEL: Record<VorgangTabKey, string> = {
  uebersicht: "Übersicht",
  dokumente: "Dokumente",
  analyse: "Analyse",
  empfehlung: "Empfehlung",
  entwurf: "E-Mail-Entwurf",
  verknuepfungen: "Verknüpfungen",
  verlauf: "Verlauf",
};

export function VorgangTabs({
  vorgangId,
  active,
  counts,
}: {
  vorgangId: string;
  active: VorgangTabKey;
  counts?: Partial<Record<VorgangTabKey, number>>;
}) {
  const tabs: TabSpec<VorgangTabKey>[] = VORGANG_TAB_KEYS.map((key) => ({
    key,
    label: TAB_LABEL[key],
    count: counts?.[key],
  }));
  return (
    <TabNav
      tabs={tabs}
      active={active}
      baseHref={`/vorgaenge/${vorgangId}`}
      defaultKey="uebersicht"
    />
  );
}
