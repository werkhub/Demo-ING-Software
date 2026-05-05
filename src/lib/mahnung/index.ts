/**
 * Mahnwesen-Lite — Verzugszinsen + Mahngebühren + Standard-Texte.
 *
 * Rechtsgrundlagen:
 *   § 286 BGB        — Verzug nach Mahnung oder 30 T nach Rechnungseingang
 *   § 288 BGB Abs. 2 — B2B: 9 % über Basiszinssatz
 *   § 288 BGB Abs. 1 — B2C: 5 % über Basiszinssatz
 *   § 16 III VOB/B   — Bauwerkverträge: 8 % über Basiszinssatz
 *
 * Basiszinssatz wird halbjährlich von der Bundesbank festgelegt; Snapshot
 * für Jan 2026: 3,62 %. Wir nutzen das als Default, können aber pro Mahnung
 * überschrieben werden.
 *
 * Mahngebühren-Höchstgrenzen (Rechtsprechung BGH):
 *   1. Mahnung:  3,00 EUR (Rechtsprechung erlaubt 2,50–5,00 EUR)
 *   2. Mahnung:  5,00 EUR
 *   3. Mahnung: 10,00 EUR (darüber tritt typisch Inkasso ein)
 */
import type {
  Ausgangsrechnung,
  AusgangsrechnungMahnung,
  Project,
} from "@/db/schema";

/** Bundesbank-Basiszinssatz Stand Jan 2026 — als Default. */
export const BASIS_ZINS_PERCENT_DEFAULT = 3.62;

/**
 * Standard-Verzugszinssatz für AN-Forderungen am Bau.
 * VOB-Vertrag → 8 % über Basis (§ 16 III VOB/B)
 * BGB-Werkvertrag B2B → 9 % über Basis (§ 288 II BGB)
 * Verbraucherbau → 5 % über Basis (§ 288 I BGB)
 */
export function defaultZinsSatzPercent(
  contractType: Project["contractType"]
): number {
  if (contractType === "verbraucherbauvertrag") {
    return BASIS_ZINS_PERCENT_DEFAULT + 5;
  }
  if (contractType === "vob_vertrag") {
    return BASIS_ZINS_PERCENT_DEFAULT + 8;
  }
  // bgb_werkvertrag oder unknown → B2B-Default 9
  return BASIS_ZINS_PERCENT_DEFAULT + 9;
}

/** Übliche Mahngebühr je Stufe (EUR). */
export const STANDARD_MAHNGEBUEHR: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 5,
  3: 10,
};

/** Übliche neue Frist je Stufe (Tage ab Mahn-Datum). */
export const STANDARD_FRIST_TAGE: Record<1 | 2 | 3, number> = {
  1: 14,
  2: 10,
  3: 7,
};

/**
 * Berechnet Verzugszinsen tagesgenau.
 *   zinsen = basisbetrag × (zinsSatzPercent / 100) × (tage / 365)
 *
 * Aufgerundet auf 2 Dezimalstellen — typisch im deutschen Mahnwesen.
 */
export function computeVerzugszinsen(
  basisbetrag: number,
  zinsSatzPercent: number,
  tage: number
): number {
  if (basisbetrag <= 0 || tage <= 0) return 0;
  const zinsen = (basisbetrag * (zinsSatzPercent / 100) * tage) / 365;
  return Math.round(zinsen * 100) / 100;
}

/** Berechnet Tage zwischen zwei ISO-Datums (b - a). */
export function daysBetweenIso(a: string, b: string): number {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (!ma || !mb) return 0;
  const da = new Date(Number(ma[1]), Number(ma[2]) - 1, Number(ma[3]));
  const db = new Date(Number(mb[1]), Number(mb[2]) - 1, Number(mb[3]));
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/** Tage Verzug am Stichtag (heute oder explizit) — 0 wenn nicht überfällig. */
export function verzugsTage(
  ar: Pick<Ausgangsrechnung, "dueDate">,
  asOfIso: string = new Date().toISOString().slice(0, 10)
): number {
  if (!ar.dueDate) return 0;
  const t = daysBetweenIso(ar.dueDate, asOfIso);
  return Math.max(0, t);
}

/** Skonto greift nur, wenn Zahlung innerhalb skontoDays nach invoiceDate. */
export function isWithinSkontoFrist(
  ar: Pick<Ausgangsrechnung, "invoiceDate" | "skontoDays" | "skontoPercent">,
  paidAtIso: string
): boolean {
  if (!ar.skontoDays || !ar.skontoPercent || ar.skontoPercent <= 0) {
    return false;
  }
  const days = daysBetweenIso(ar.invoiceDate, paidAtIso);
  return days >= 0 && days <= ar.skontoDays;
}

/** Berechnet den Skonto-Abzug in EUR. */
export function computeSkontoAbzug(
  payoutGross: number,
  skontoPercent: number
): number {
  return Math.round((payoutGross * skontoPercent) / 100 * 100) / 100;
}

/**
 * Generiert den Standard-Mahn-Text (Markdown). Vom User editierbar vor
 * Versand. Der Text enthält gesetzlich relevante Bausteine je Stufe.
 */
export function defaultMahnungText(opts: {
  level: 1 | 2 | 3;
  ar: Pick<
    Ausgangsrechnung,
    "number" | "invoiceDate" | "payoutGross" | "dueDate"
  >;
  newDueDate: string;
  mahngebuehr: number;
  verzugszinsen: number;
  zinsSatzPercent: number;
  zinsTage: number;
  partyAg?: string | null;
}): string {
  const summe = opts.ar.payoutGross.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
  });
  const zinsen = opts.verzugszinsen.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
  });
  const gebuehr = opts.mahngebuehr.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
  });
  const total = (
    opts.ar.payoutGross +
    opts.mahngebuehr +
    opts.verzugszinsen
  ).toLocaleString("de-DE", { minimumFractionDigits: 2 });

  const titel = ["", "Zahlungserinnerung", "2. Mahnung", "3. und letzte Mahnung"][opts.level];
  const tonStufe = [
    "",
    "Möglicherweise haben Sie unsere Rechnung übersehen — wir bitten Sie höflich um Begleichung.",
    "Trotz unserer ersten Mahnung ist der Rechnungsbetrag noch nicht bei uns eingegangen.",
    "Trotz mehrfacher Mahnung ist die Rechnung weiterhin offen. Bei Nichtzahlung bis zur unten genannten Frist behalten wir uns rechtliche Schritte und gerichtliches Mahnverfahren vor — die dabei anfallenden Kosten gehen vollständig zu Ihren Lasten.",
  ][opts.level];

  return [
    `**${titel} zur Rechnung ${opts.ar.number}**`,
    "",
    opts.partyAg ? `Sehr geehrte Damen und Herren bei ${opts.partyAg},` : "Sehr geehrte Damen und Herren,",
    "",
    tonStufe,
    "",
    `**Forderungs-Aufstellung**`,
    "",
    `| Position | Betrag |`,
    `|---|---:|`,
    `| Hauptforderung (Rechnung ${opts.ar.number}, ${opts.ar.invoiceDate}) | ${summe} EUR |`,
    `| Verzugszinsen (${opts.zinsTage} Tage × ${opts.zinsSatzPercent.toLocaleString("de-DE")} % p.a.) | ${zinsen} EUR |`,
    `| Mahngebühr | ${gebuehr} EUR |`,
    `| **Gesamtforderung** | **${total} EUR** |`,
    "",
    `Bitte überweisen Sie den Gesamtbetrag bis spätestens **${opts.newDueDate}** auf das in der Rechnung angegebene Konto. Bei zwischenzeitlicher Zahlung betrachten Sie dieses Schreiben bitte als gegenstandslos.`,
    "",
    "Mit freundlichen Grüßen",
  ].join("\n");
}

export const MAHNUNG_LEVEL_LABEL: Record<number, string> = {
  1: "1. Mahnung",
  2: "2. Mahnung",
  3: "3. Mahnung",
};

/** Gesamtforderung einer Mahnung = Hauptforderung + Zinsen + Gebühr. */
export function mahnungTotal(
  ar: Pick<Ausgangsrechnung, "payoutGross">,
  m: Pick<AusgangsrechnungMahnung, "verzugszinsen" | "mahngebuehr">
): number {
  return (
    Math.round(
      ((ar.payoutGross ?? 0) + (m.verzugszinsen ?? 0) + (m.mahngebuehr ?? 0)) *
        100
    ) / 100
  );
}
