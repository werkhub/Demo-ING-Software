/**
 * LV-Logik (rein, ohne DB-Zugriffe).
 */
import type { LvItem, LvItemKind, LvStatus } from "@/db/schema";

export const LV_STATUS_LABEL: Record<LvStatus, string> = {
  entwurf: "Entwurf",
  angebot: "Angebot",
  auftrag: "Auftrag",
  aufmass: "Im Aufmaß",
  abgerechnet: "Abgerechnet",
};

export const LV_ITEM_KIND_LABEL: Record<LvItemKind, string> = {
  titel: "Titel",
  untertitel: "Untertitel",
  position: "Position",
  eventual: "Eventualposition",
  bedarfsposition: "Bedarfsposition",
  stundenlohn: "Stundenlohn",
};

export const POSITION_KINDS: LvItemKind[] = [
  "position",
  "eventual",
  "bedarfsposition",
  "stundenlohn",
];

export function isPositionKind(kind: LvItemKind): boolean {
  return POSITION_KINDS.includes(kind);
}

export function isOptionalKind(kind: LvItemKind): boolean {
  return kind === "eventual" || kind === "bedarfsposition";
}

export type LvNode = LvItem & { children: LvNode[] };

/**
 * Flacher Item-Array → verschachtelter Tree. Wurzeln (parentId=null) bilden
 * die oberste Ebene. Sortierung innerhalb jeder Ebene nach sortIndex, dann
 * createdAt (für stabile Reihenfolge bei gleichem sortIndex).
 */
export function buildItemTree(items: LvItem[]): LvNode[] {
  const byParent = new Map<string | null, LvItem[]>();
  for (const it of items) {
    const arr = byParent.get(it.parentId) ?? [];
    arr.push(it);
    byParent.set(it.parentId, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  function build(parentId: string | null): LvNode[] {
    const direct = byParent.get(parentId) ?? [];
    return direct.map((it) => ({
      ...it,
      children: build(it.id),
    }));
  }
  return build(null);
}

export type LvTotals = {
  totalNet: number;
  totalGross: number;
  optionalNet: number;
  positionCount: number;
  optionalCount: number;
};

/**
 * Summen — nur kind=position fließt in totalNet/Gross. Eventual/Bedarf werden
 * separat aufgeführt und NICHT in die Hauptsumme aufgenommen (entspricht
 * Marktstandard und Vergaberecht).
 */
export function computeTotals(items: LvItem[]): LvTotals {
  let totalNet = 0;
  let totalGross = 0;
  let optionalNet = 0;
  let positionCount = 0;
  let optionalCount = 0;
  for (const it of items) {
    if (it.kind === "position" || it.kind === "stundenlohn") {
      const tp = it.totalPrice ?? 0;
      totalNet += tp;
      totalGross += tp * (1 + (it.vatPercent ?? 19) / 100);
      positionCount += 1;
    } else if (it.kind === "eventual" || it.kind === "bedarfsposition") {
      optionalNet += it.totalPrice ?? 0;
      optionalCount += 1;
    }
  }
  return {
    totalNet: Math.round(totalNet * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    optionalNet: Math.round(optionalNet * 100) / 100,
    positionCount,
    optionalCount,
  };
}

/** Berechnet totalPrice aus quantity × unitPrice — null wenn eines fehlt. */
export function computeItemTotal(
  quantity: number | null,
  unitPrice: number | null
): number | null {
  if (quantity === null || unitPrice === null) return null;
  return Math.round(quantity * unitPrice * 100) / 100;
}
