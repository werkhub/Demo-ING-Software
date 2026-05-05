/**
 * XRechnung 3.x Generator (UBL 2.1).
 *
 * Erzeugt eine valide UBL-2.1-Invoice nach EN-16931 / XRechnung 3.0. Nutzt
 * fast-xml-parser XMLBuilder für sicheres Escaping — keine String-Konkatenation.
 *
 * Bewusst tolerant: fehlende optionale Felder werden weggelassen, statt mit
 * leeren Tags die Schematron-Validation zu brechen.
 */
import { XMLBuilder } from "fast-xml-parser";
import {
  DEFAULT_CURRENCY,
  INVOICE_TYPE_CODE,
  XRECHNUNG_PROFILE_ID,
  XRECHNUNG_PROFILE_URN,
  type XrechnungContext,
} from "./types";

function fmtMoney(n: number): string {
  return n.toFixed(2);
}

function fmtQty(n: number): string {
  // 4 Dezimalstellen, weil REB-Aufmaß 4 NK liefern kann
  return n.toFixed(4);
}

function splitAddress(addr: string | null): {
  street: string | null;
  cityWithPlz: string | null;
  postalZone: string | null;
  city: string | null;
  countryCode: string;
} {
  if (!addr) {
    return {
      street: null,
      cityWithPlz: null,
      postalZone: null,
      city: null,
      countryCode: "DE",
    };
  }
  // Sehr einfache Heuristik: erste Zeile = Straße, zweite Zeile = "PLZ Ort"
  const lines = addr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const street = lines[0] ?? null;
  const cityLine = lines[1] ?? null;
  let postalZone: string | null = null;
  let city: string | null = null;
  if (cityLine) {
    const m = /^(\d{4,5})\s+(.+)$/.exec(cityLine);
    if (m) {
      postalZone = m[1];
      city = m[2];
    } else {
      city = cityLine;
    }
  }
  // Letzte Zeile als Land wenn 2-3 Buchstaben (DE, AT, CH …)
  let countryCode = "DE";
  if (lines.length > 2) {
    const last = lines[lines.length - 1];
    if (/^[A-Z]{2,3}$/.test(last)) countryCode = last;
  }
  return { street, cityWithPlz: cityLine, postalZone, city, countryCode };
}

/**
 * Build the document object structure that fast-xml-parser turns into XML.
 * Wir bauen das Objekt mit Namespace-Prefixes (cbc: / cac:).
 */
export function generateXrechnungXml(ctx: XrechnungContext): string {
  const { ar, positionen, project, workspace } = ctx;

  const sellerName = ar.partyAn ?? workspace.name;
  const sellerTaxId = ar.partyAnTaxId ?? workspace.taxId ?? null;
  const sellerVatId = ar.partyAnVatId ?? workspace.vatId ?? null;
  const sellerAddrSrc = ar.partyAnAddress ?? workspace.address;
  const sellerAddr = splitAddress(sellerAddrSrc);

  const buyerName = ar.partyAg ?? project.ag;
  const buyerAddr = splitAddress(ar.partyAgAddress);

  const docTypeCode =
    ar.kind === "abschlag" ? INVOICE_TYPE_CODE.PARTIAL : INVOICE_TYPE_CODE.COMMERCIAL;
  // Multi-Währung kommt später per Schema-Migration; EUR ist Standard für DACH.
  const currency = DEFAULT_CURRENCY;

  // Berechnungen — UBL 2.1 unterscheidet:
  //   LineExtensionAmount    = Σ position.totalPrice
  //   TaxExclusiveAmount     = LineExtensionAmount − Voraus − Sicherheit (= ar.payoutNet)
  //   TaxAmount              = ar.payoutVat
  //   TaxInclusiveAmount     = ar.payoutGross
  //   PrepaidAmount          = previousAbschlaege + securityRetention (als gesammelte
  //                            Vorauszahlung, weil UBL keine eigenen Felder dafür kennt)
  //   PayableAmount          = ar.payoutGross
  const lineExtensionAmount = ar.totalPositionsNet;
  const taxExclusiveAmount = ar.payoutNet;
  const taxAmount = ar.payoutVat;
  const taxInclusiveAmount = ar.payoutGross;
  const prepaidAmount =
    ar.previousAbschlaegeNet + ar.securityRetentionAmount;

  type X = Record<string, unknown>;

  const sellerParty: X = {
    "cac:Party": {
      "cac:PartyName": sellerName ? { "cbc:Name": sellerName } : undefined,
      "cac:PostalAddress": {
        "cbc:StreetName": sellerAddr.street ?? undefined,
        "cbc:CityName": sellerAddr.city ?? undefined,
        "cbc:PostalZone": sellerAddr.postalZone ?? undefined,
        "cac:Country": { "cbc:IdentificationCode": sellerAddr.countryCode },
      },
      "cac:PartyTaxScheme": sellerVatId
        ? {
            "cbc:CompanyID": sellerVatId,
            "cac:TaxScheme": { "cbc:ID": "VAT" },
          }
        : undefined,
      "cac:PartyLegalEntity": {
        "cbc:RegistrationName": sellerName ?? "Unbekannt",
        ...(sellerTaxId
          ? { "cbc:CompanyID": sellerTaxId }
          : {}),
      },
      "cac:Contact": {
        "cbc:ElectronicMail": workspace.email ?? "no-reply@invalid",
      },
    },
  };

  const buyerParty: X = {
    "cac:Party": {
      "cac:PartyName": buyerName ? { "cbc:Name": buyerName } : undefined,
      "cac:PostalAddress": {
        "cbc:StreetName": buyerAddr.street ?? undefined,
        "cbc:CityName": buyerAddr.city ?? undefined,
        "cbc:PostalZone": buyerAddr.postalZone ?? undefined,
        "cac:Country": { "cbc:IdentificationCode": buyerAddr.countryCode },
      },
      "cac:PartyLegalEntity": {
        "cbc:RegistrationName": buyerName ?? "Unbekannt",
      },
    },
  };

  const paymentMeans: X | undefined = workspace.iban
    ? {
        // 30 = Credit transfer (Überweisung)
        "cbc:PaymentMeansCode": 30,
        "cbc:PaymentID": ar.number,
        "cac:PayeeFinancialAccount": {
          "cbc:ID": workspace.iban,
          ...(workspace.bankName
            ? { "cbc:Name": workspace.bankName }
            : {}),
          ...(workspace.bic
            ? {
                "cac:FinancialInstitutionBranch": {
                  "cbc:ID": workspace.bic,
                },
              }
            : {}),
        },
      }
    : undefined;

  const taxSubtotal: X = {
    "cbc:TaxableAmount": {
      "@_currencyID": currency,
      "#text": fmtMoney(taxExclusiveAmount),
    },
    "cbc:TaxAmount": {
      "@_currencyID": currency,
      "#text": fmtMoney(taxAmount),
    },
    "cac:TaxCategory": {
      "cbc:ID": "S",
      "cbc:Percent": ar.vatPercent,
      "cac:TaxScheme": { "cbc:ID": "VAT" },
    },
  };

  const invoiceLines: X[] = positionen.map((p, idx) => {
    const qty = p.quantity ?? 0;
    const tp = p.totalPrice ?? 0;
    return {
      "cbc:ID": String(idx + 1),
      "cbc:InvoicedQuantity": {
        "@_unitCode": mapUnitToUnece(p.unit),
        "#text": fmtQty(qty),
      },
      "cbc:LineExtensionAmount": {
        "@_currencyID": currency,
        "#text": fmtMoney(tp),
      },
      "cac:Item": {
        "cbc:Name": p.description.slice(0, 200),
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(p.unitPrice ?? 0),
        },
      },
    };
  });

  const invoiceObject: X = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    Invoice: {
      "@_xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@_xmlns:cac":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@_xmlns:cbc":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "cbc:CustomizationID": XRECHNUNG_PROFILE_URN,
      "cbc:ProfileID": XRECHNUNG_PROFILE_ID,
      "cbc:ID": ar.number,
      "cbc:IssueDate": ar.invoiceDate,
      ...(ar.dueDate ? { "cbc:DueDate": ar.dueDate } : {}),
      "cbc:InvoiceTypeCode": docTypeCode,
      "cbc:DocumentCurrencyCode": currency,
      ...(ar.buyerReference
        ? { "cbc:BuyerReference": ar.buyerReference }
        : { "cbc:BuyerReference": "—" }),
      ...(ar.serviceStart && ar.serviceEnd
        ? {
            "cac:InvoicePeriod": {
              "cbc:StartDate": ar.serviceStart,
              "cbc:EndDate": ar.serviceEnd,
            },
          }
        : {}),
      ...(ar.purchaseOrderRef
        ? {
            "cac:OrderReference": { "cbc:ID": ar.purchaseOrderRef },
          }
        : {}),
      "cac:AccountingSupplierParty": sellerParty,
      "cac:AccountingCustomerParty": buyerParty,
      ...(paymentMeans ? { "cac:PaymentMeans": paymentMeans } : {}),
      ...(ar.skontoPercent && ar.skontoDays
        ? {
            "cac:PaymentTerms": {
              "cbc:Note": `Skonto: ${ar.skontoPercent} % bei Zahlung in ${ar.skontoDays} Tagen.`,
            },
          }
        : {}),
      "cac:TaxTotal": {
        "cbc:TaxAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(taxAmount),
        },
        "cac:TaxSubtotal": taxSubtotal,
      },
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(lineExtensionAmount),
        },
        "cbc:TaxExclusiveAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(taxExclusiveAmount),
        },
        "cbc:TaxInclusiveAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(taxInclusiveAmount),
        },
        ...(prepaidAmount > 0
          ? {
              "cbc:PrepaidAmount": {
                "@_currencyID": currency,
                "#text": fmtMoney(prepaidAmount),
              },
            }
          : {}),
        "cbc:PayableAmount": {
          "@_currencyID": currency,
          "#text": fmtMoney(taxInclusiveAmount),
        },
      },
      "cac:InvoiceLine": invoiceLines,
    },
  };

  const builder = new XMLBuilder({
    format: true,
    indentBy: "  ",
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    suppressEmptyNode: true,
  });
  return builder.build(invoiceObject) as string;
}

/**
 * Mapped die UI-Einheit auf einen UN/ECE Recommendation 20 Unit Code.
 * Konservativ: bei Unbekanntem default „C62" (one).
 */
export function mapUnitToUnece(unit: string | null): string {
  if (!unit) return "C62";
  const u = unit.toLowerCase().trim();
  switch (u) {
    case "stk":
    case "st":
    case "stück":
    case "stueck":
    case "pcs":
      return "H87"; // piece
    case "psch":
    case "pauschal":
      return "LS"; // lump sum
    case "m":
    case "lfm":
    case "m'":
    case "meter":
      return "MTR";
    case "m²":
    case "m2":
    case "qm":
      return "MTK";
    case "m³":
    case "m3":
    case "cbm":
      return "MTQ";
    case "kg":
      return "KGM";
    case "t":
    case "to":
    case "tonne":
      return "TNE";
    case "h":
    case "std":
    case "stunde":
    case "stunden":
      return "HUR";
    case "tag":
    case "tage":
    case "d":
      return "DAY";
    case "l":
    case "liter":
      return "LTR";
    default:
      return "C62";
  }
}
