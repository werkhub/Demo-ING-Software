/**
 * E-Rechnungs-Parser für eingehende XRechnung (UBL/CII) und ZUGFeRD (PDF/A-3
 * mit eingebettetem XML).
 *
 * Strategie:
 *   - Format-Erkennung an Root-Element des XML
 *   - UBL: <Invoice>      → CEN-EN-16931-Profil oder XRechnung
 *   - CII: <CrossIndustryInvoice> → ZUGFeRD oder XRechnung-CII
 *   - ZUGFeRD: PDF/A-3 mit eingebetteter Datei "factur-x.xml" oder "ZUGFeRD-invoice.xml"
 *
 * Wir extrahieren nur Pflicht-BT-Codes — Header (BT-1, BT-2, BT-5, BT-6),
 * Lieferant (BG-25), Käufer (BG-26), Beträge (BT-106, BT-109, BT-112, BT-115).
 *
 * Robustheits-Gedanken:
 *   - Tolerant gegenüber Namespace-Präfixen (cbc:, cac:, ram:, rsm:)
 *   - Fehlende Felder → null statt throw
 *   - Format-Heuristik bei mehrdeutigen Profilen
 */
import { XMLParser } from "fast-xml-parser";

export type ErechnungXmlFormat =
  | "xrechnung_ubl"
  | "xrechnung_cii"
  | "zugferd"
  | "ubl_unspezifisch"
  | "cii_unspezifisch"
  | "unbekannt";

export type ParsedErechnung = {
  format: ErechnungXmlFormat;
  /** BT-1 Rechnungsnummer. */
  rechnungsnr: string | null;
  /** BT-2 Rechnungsdatum YYYY-MM-DD. */
  rechnungsdatum: string | null;
  /** BT-3 Rechnungstyp (380 = Standard, 326 = Abschlag). */
  rechnungstyp: string | null;
  /** BT-5 Währung. */
  waehrung: string | null;
  /** BT-9 Fälligkeit. */
  faelligkeit: string | null;
  /** BG-25 Lieferant. */
  lieferantName: string | null;
  lieferantUstId: string | null;
  /** BG-26 Käufer. */
  kaeuferName: string | null;
  /** BT-106 Summe Position-Netto. */
  summePositionenNettoCents: number;
  /** BT-109 Gesamtnetto. */
  gesamtNettoCents: number;
  /** BT-110 Gesamt-USt. */
  gesamtUstCents: number;
  /** BT-112 Bruttosumme. */
  bruttoSummeCents: number;
  /** BT-115 Zahlbar. */
  zahlbarSummeCents: number;
  /** Rohe Position-Liste (vereinfacht). */
  positionen: Array<{
    posNr: string | null;
    bezeichnung: string | null;
    menge: number;
    einheit: string | null;
    einzelpreisCents: number;
    summeNettoCents: number;
    ustSatzPct: number | null;
  }>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

function pickText(node: unknown): string | null {
  if (node === null || node === undefined) return null;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && node !== null) {
    const o = node as Record<string, unknown>;
    if ("#text" in o) return pickText(o["#text"]);
  }
  return null;
}

function pickArray<T>(maybe: T | T[] | undefined): T[] {
  if (maybe === undefined || maybe === null) return [];
  return Array.isArray(maybe) ? maybe : [maybe];
}

function toCents(s: string | null): number {
  if (!s) return 0;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function toNum(s: string | null): number {
  if (!s) return 0;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return n;
}

/* ============== FORMAT-ERKENNUNG ============== */

export function detectFormat(xml: string): ErechnungXmlFormat {
  // CII zuerst prüfen — sonst trifft der UBL-Check zuerst auf
  // "CrossIndustryInvoice" (das "Invoice" enthält).
  const isCii =
    xml.includes("CrossIndustryInvoice") ||
    xml.includes("<rsm:") ||
    xml.includes("<ram:");
  if (isCii) {
    if (xml.includes("xrechnung")) return "xrechnung_cii";
    return "zugferd";
  }
  const isUbl =
    xml.includes("urn:oasis:names:specification:ubl:schema") ||
    /(^|\s|>)<(\w+:)?Invoice(\s|>)/.test(xml);
  if (isUbl) {
    if (
      xml.includes("xrechnung") ||
      xml.includes("urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit")
    ) {
      return "xrechnung_ubl";
    }
    return "ubl_unspezifisch";
  }
  return "unbekannt";
}

/* ============== UBL-PARSER ============== */

function parseUbl(xml: string, format: ErechnungXmlFormat): ParsedErechnung {
  const root = parser.parse(xml) as Record<string, unknown>;
  const inv = (root.Invoice ?? {}) as Record<string, unknown>;

  const supplierParty = (inv.AccountingSupplierParty as Record<string, unknown>)
    ?.Party as Record<string, unknown> | undefined;
  const customerParty = (inv.AccountingCustomerParty as Record<string, unknown>)
    ?.Party as Record<string, unknown> | undefined;

  const lieferantName =
    pickText(
      ((supplierParty?.PartyLegalEntity as Record<string, unknown>)
        ?.RegistrationName as unknown)
    ) ??
    pickText(
      ((supplierParty?.PartyName as Record<string, unknown>)?.Name as unknown)
    );
  const lieferantUstId = pickText(
    ((supplierParty?.PartyTaxScheme as Record<string, unknown>)
      ?.CompanyID as unknown) ?? null
  );
  const kaeuferName =
    pickText(
      ((customerParty?.PartyLegalEntity as Record<string, unknown>)
        ?.RegistrationName as unknown)
    ) ??
    pickText(
      ((customerParty?.PartyName as Record<string, unknown>)?.Name as unknown)
    );

  const monetaryTotal = (inv.LegalMonetaryTotal as
    | Record<string, unknown>
    | undefined) ?? {};

  const positionsRaw = pickArray(inv.InvoiceLine as unknown);
  const positionen = positionsRaw.map((line) => {
    const l = line as Record<string, unknown>;
    const price = (l.Price as Record<string, unknown>) ?? {};
    const quantity = pickText(l.InvoicedQuantity);
    const quantityAttrs = (l.InvoicedQuantity as Record<string, unknown>) ?? {};
    return {
      posNr: pickText(l.ID),
      bezeichnung:
        pickText((l.Item as Record<string, unknown>)?.Name) ??
        pickText((l.Item as Record<string, unknown>)?.Description),
      menge: toNum(quantity),
      einheit: pickText(quantityAttrs["@unitCode"] as unknown),
      einzelpreisCents: toCents(pickText(price.PriceAmount)),
      summeNettoCents: toCents(pickText(l.LineExtensionAmount)),
      ustSatzPct: null,
    };
  });

  return {
    format,
    rechnungsnr: pickText(inv.ID),
    rechnungsdatum: pickText(inv.IssueDate),
    rechnungstyp: pickText(inv.InvoiceTypeCode),
    waehrung: pickText(inv.DocumentCurrencyCode),
    faelligkeit: pickText(inv.DueDate),
    lieferantName: lieferantName ?? null,
    lieferantUstId: lieferantUstId ?? null,
    kaeuferName: kaeuferName ?? null,
    summePositionenNettoCents: toCents(pickText(monetaryTotal.LineExtensionAmount)),
    gesamtNettoCents: toCents(pickText(monetaryTotal.TaxExclusiveAmount)),
    gesamtUstCents: (() => {
      const taxTotal = pickArray(inv.TaxTotal as unknown)[0] as
        | Record<string, unknown>
        | undefined;
      return toCents(pickText(taxTotal?.TaxAmount));
    })(),
    bruttoSummeCents: toCents(pickText(monetaryTotal.TaxInclusiveAmount)),
    zahlbarSummeCents: toCents(pickText(monetaryTotal.PayableAmount)),
    positionen,
  };
}

/* ============== CII-PARSER (ZUGFeRD / XRechnung-CII) ============== */

function parseCii(xml: string, format: ErechnungXmlFormat): ParsedErechnung {
  const root = parser.parse(xml) as Record<string, unknown>;
  const cii = (root.CrossIndustryInvoice ?? {}) as Record<string, unknown>;

  const exchanged = (cii.ExchangedDocument as Record<string, unknown>) ?? {};
  const transaction = (cii.SupplyChainTradeTransaction as Record<
    string,
    unknown
  >) ?? {};
  const headerAgreement = (transaction.ApplicableHeaderTradeAgreement as Record<
    string,
    unknown
  >) ?? {};
  const headerSettlement = (transaction.ApplicableHeaderTradeSettlement as Record<
    string,
    unknown
  >) ?? {};

  const seller = (headerAgreement.SellerTradeParty as Record<string, unknown>) ?? {};
  const buyer = (headerAgreement.BuyerTradeParty as Record<string, unknown>) ?? {};

  const summation = (headerSettlement.SpecifiedTradeSettlementHeaderMonetarySummation as Record<
    string,
    unknown
  >) ?? {};

  const issueDateTime = (exchanged.IssueDateTime as Record<string, unknown>)?.DateTimeString;
  const issueDateRaw = pickText(issueDateTime);
  const issueDate = issueDateRaw && /^\d{8}$/.test(issueDateRaw)
    ? `${issueDateRaw.slice(0, 4)}-${issueDateRaw.slice(4, 6)}-${issueDateRaw.slice(6, 8)}`
    : issueDateRaw;

  const sellerTaxId = (() => {
    const taxReg = pickArray(seller.SpecifiedTaxRegistration as unknown);
    for (const t of taxReg) {
      const tr = t as Record<string, unknown>;
      const id = tr.ID as Record<string, unknown> | undefined;
      const value = pickText(id);
      if (value) return value;
    }
    return null;
  })();

  const lineItems = pickArray(transaction.IncludedSupplyChainTradeLineItem as unknown);
  const positionen = lineItems.map((line) => {
    const l = line as Record<string, unknown>;
    const lineDoc = (l.AssociatedDocumentLineDocument as Record<string, unknown>) ?? {};
    const product = (l.SpecifiedTradeProduct as Record<string, unknown>) ?? {};
    const agreement = (l.SpecifiedLineTradeAgreement as Record<string, unknown>) ?? {};
    const delivery = (l.SpecifiedLineTradeDelivery as Record<string, unknown>) ?? {};
    const settlement = (l.SpecifiedLineTradeSettlement as Record<string, unknown>) ?? {};
    const summ = (settlement.SpecifiedTradeSettlementLineMonetarySummation as Record<
      string,
      unknown
    >) ?? {};
    const netPrice = (agreement.NetPriceProductTradePrice as Record<string, unknown>) ?? {};
    const billed = delivery.BilledQuantity as Record<string, unknown> | undefined;

    return {
      posNr: pickText(lineDoc.LineID),
      bezeichnung: pickText(product.Name),
      menge: toNum(pickText(billed)),
      einheit: pickText(billed?.["@unitCode"] as unknown),
      einzelpreisCents: toCents(pickText(netPrice.ChargeAmount)),
      summeNettoCents: toCents(pickText(summ.LineTotalAmount)),
      ustSatzPct: null,
    };
  });

  return {
    format,
    rechnungsnr: pickText(exchanged.ID),
    rechnungsdatum: issueDate,
    rechnungstyp: pickText(exchanged.TypeCode),
    waehrung: pickText(headerSettlement.InvoiceCurrencyCode),
    faelligkeit: (() => {
      const terms = (headerSettlement.SpecifiedTradePaymentTerms as Record<string, unknown>) ?? {};
      const dt = terms.DueDateDateTime as Record<string, unknown> | undefined;
      const raw = pickText(dt?.DateTimeString);
      if (raw && /^\d{8}$/.test(raw)) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      }
      return raw;
    })(),
    lieferantName: pickText(seller.Name),
    lieferantUstId: sellerTaxId,
    kaeuferName: pickText(buyer.Name),
    summePositionenNettoCents: toCents(pickText(summation.LineTotalAmount)),
    gesamtNettoCents: toCents(pickText(summation.TaxBasisTotalAmount)),
    gesamtUstCents: toCents(pickText(summation.TaxTotalAmount)),
    bruttoSummeCents: toCents(pickText(summation.GrandTotalAmount)),
    zahlbarSummeCents: toCents(pickText(summation.DuePayableAmount)),
    positionen,
  };
}

/* ============== HAUPT-PARSER ============== */

export function parseErechnungXml(xml: string): ParsedErechnung {
  const format = detectFormat(xml);
  if (
    format === "xrechnung_ubl" ||
    format === "ubl_unspezifisch"
  ) {
    return parseUbl(xml, format);
  }
  if (format === "xrechnung_cii" || format === "zugferd") {
    return parseCii(xml, format);
  }
  // Versuchen, anhand des Inhalts trotzdem zu parsen
  if (xml.includes("Invoice")) return parseUbl(xml, "ubl_unspezifisch");
  if (xml.includes("CrossIndustryInvoice")) return parseCii(xml, "cii_unspezifisch");
  return {
    format: "unbekannt",
    rechnungsnr: null,
    rechnungsdatum: null,
    rechnungstyp: null,
    waehrung: null,
    faelligkeit: null,
    lieferantName: null,
    lieferantUstId: null,
    kaeuferName: null,
    summePositionenNettoCents: 0,
    gesamtNettoCents: 0,
    gesamtUstCents: 0,
    bruttoSummeCents: 0,
    zahlbarSummeCents: 0,
    positionen: [],
  };
}
