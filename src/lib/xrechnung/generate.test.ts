import { describe, expect, it } from "vitest";
import type {
  Ausgangsrechnung,
  AusgangsrechnungPosition,
  Project,
  Workspace,
} from "@/db/schema";
import { generateXrechnungXml, mapUnitToUnece } from "./generate";
import { validateForXrechnung } from "./validate";

function makeContext(overrides: {
  ar?: Partial<Ausgangsrechnung>;
  positionen?: AusgangsrechnungPosition[];
  project?: Partial<Project>;
  workspace?: Partial<Workspace>;
} = {}) {
  const workspace: Workspace = {
    id: "ws_1",
    name: "Bauunternehmen Test GmbH",
    tier: "team",
    workspaceRole: "bauunternehmer",
    disciplinesJson: "[]",
    disciplineSubprofile: "custom",
    clientFocus: "gemischt",
    companySize: null,
    vobLicenseStatus: "active",
    vobValidUntil: null,
    vobLicenseProvider: "none",
    vobPreferredExternalProvider: "all",
    hinschgEnabled: false,
    hinschgOfficeContactEmail: null,
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    bankName: "Commerzbank",
    taxId: "123/456/78901",
    vatId: "DE123456789",
    address: "Musterstraße 1\n12345 Berlin",
    email: "info@bauunternehmen-test.de",
    phone: "+49 30 1234567",
    bauabzugPflichtig: false,
    datevBeraterNr: null,
    datevMandantNr: null,
    datevKontenrahmen: "skr03",
    datevKundenSammelkonto: 10001,
    datevLieferantenSammelkonto: 70001,
    datevKontenMappingJson: null,
    datevWjStartMmdd: "0101",
    defaultLocale: null,
    createdAt: new Date(),
    ...(overrides.workspace ?? {}),
  };
  const project: Project = {
    id: "p_1",
    workspaceId: "ws_1",
    identifier: "BV-2026-001",
    name: "Sporthalle Köln-Mülheim",
    ag: "Stadt Köln · Hochbauamt",
    value: 500_000,
    status: "Bauphase",
    progress: 0.3,
    contractType: "vob_vertrag",
    contractDate: "2025-01-15",
    plannedCompletion: null,
    abnahmeDate: null,
    warrantyEnd: null,
    siteAddress: "Berliner Str. 100, 51063 Köln",
    lat: null,
    lon: null,
    penaltyClauseAgreed: true,
    isBauleistung: true,
    securityRetentionPercent: 5,
    vertraulich: false,
    hoaiLeistungsbild: null,
    hoaiParagraph: null,
    hoaiHonorarzone: null,
    hoaiSatz: "mittel",
    hoaiAnrechenbareKostenCents: null,
    hoaiBeauftragteLpsJson: null,
    hoaiUmbauZuschlagPct: null,
    hoaiNebenkostenPct: null,
    hoaiHonorarsummeNettoCents: null,
    hoaiBerechnetAm: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(overrides.project ?? {}),
  };
  const ar: Ausgangsrechnung = {
    id: "ar_1",
    workspaceId: "ws_1",
    projectId: "p_1",
    lvId: null,
    aufmassId: null,
    number: "AR-2026-0001",
    kind: "abschlag",
    abschlagNo: 1,
    invoiceDate: "2026-03-15",
    serviceStart: "2026-02-01",
    serviceEnd: "2026-02-28",
    dueDate: "2026-04-14",
    skontoPercent: 2,
    skontoDays: 10,
    vatPercent: 19,
    partyAg: "Stadt Köln · Hochbauamt",
    partyAgAddress: "Bauamt 1\n50667 Köln",
    partyAn: "Bauunternehmen Test GmbH",
    partyAnAddress: "Musterstraße 1\n12345 Berlin",
    partyAnTaxId: "123/456/78901",
    partyAnVatId: "DE123456789",
    recipientVatId: null,
    recipientIsBauunternehmer: false,
    reverseCharge: false,
    reverseChargeGrund: null,
    subjectLine: "1. Abschlagsrechnung",
    previousAbschlaegeNet: 0,
    securityRetentionPercent: 5,
    securityRetentionAmount: 500,
    totalPositionsNet: 10000,
    payoutNet: 9500,
    payoutVat: 1805,
    payoutGross: 11305,
    status: "entwurf",
    sentAt: null,
    paidAt: null,
    paidAmount: null,
    schlusszahlungsVorbehalt: null,
    pdfPath: null,
    buyerReference: "04011000-1234512345-06",
    purchaseOrderRef: "PO-2026-42",
    xrechnungXmlPath: null,
    xrechnungGeneratedAt: null,
    xrechnungProfile:
      "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0",
    zugferdPdfPath: null,
    zugferdGeneratedAt: null,
    zugferdProfile: "XRECHNUNG",
    hoaiBreakdownJson: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(overrides.ar ?? {}),
  };
  const positionen: AusgangsrechnungPosition[] = overrides.positionen ?? [
    {
      id: "p_1",
      workspaceId: "ws_1",
      ausgangsrechnungId: "ar_1",
      lvItemId: null,
      aufmassZeileId: null,
      oz: "01.02.030",
      description: "Putz Treppenhaus EG, Wandfläche",
      quantity: 100,
      unit: "m²",
      unitPrice: 100,
      totalPrice: 10000,
      vatPercent: 19,
      sortIndex: 0,
      lpReferenz: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  return { ar, positionen, project, workspace };
}

describe("validateForXrechnung", () => {
  it("akzeptiert vollständige Daten", () => {
    const ctx = makeContext();
    expect(validateForXrechnung(ctx)).toEqual({ ok: true });
  });

  it("meckert bei fehlender Käufer-Anschrift", () => {
    const ctx = makeContext({ ar: { partyAgAddress: null } });
    const r = validateForXrechnung(ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.join(" ")).toMatch(/Käufer-Anschrift/);
  });

  it("warnt wenn IBAN fehlt", () => {
    const ctx = makeContext({ workspace: { iban: null } });
    const r = validateForXrechnung(ctx);
    expect(r.ok).toBe(true);
    // Warnings werden nur bei !ok ausgewertet — bei ok nicht im Result.
    // Daher hier nur prüfen, dass Generator nicht crasht (siehe nächster Test).
  });

  it("warnt wenn Käufer-Referenz fehlt", () => {
    const ctx = makeContext({ ar: { buyerReference: null } });
    const r = validateForXrechnung(ctx);
    expect(r.ok).toBe(true); // nur Warnung, nicht hart Pflicht
  });

  it("meckert wenn Position EP fehlt", () => {
    const ctx = makeContext({
      positionen: [
        {
          id: "p_x",
          workspaceId: "ws_1",
          ausgangsrechnungId: "ar_1",
          lvItemId: null,
          aufmassZeileId: null,
          oz: null,
          description: "Kaputte Position",
          quantity: 5,
          unit: "Stk",
          unitPrice: null,
          totalPrice: null,
          vatPercent: 19,
          sortIndex: 0,
          lpReferenz: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const r = validateForXrechnung(ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.join(" ")).toMatch(/Menge, Einheit oder EP/);
  });
});

describe("generateXrechnungXml", () => {
  it("liefert valides XML mit Pflicht-Strukturen", () => {
    const ctx = makeContext();
    const xml = generateXrechnungXml(ctx);
    // Header
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    // Wurzel-Tag mit Namespace
    expect(xml).toContain("<Invoice");
    expect(xml).toContain(
      'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'
    );
    // CustomizationID = XRechnung 3.0 URN
    expect(xml).toContain(
      "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0"
    );
    // Pflicht-Felder
    expect(xml).toContain("<cbc:ID>AR-2026-0001</cbc:ID>");
    expect(xml).toContain("<cbc:IssueDate>2026-03-15</cbc:IssueDate>");
    expect(xml).toContain("<cbc:DueDate>2026-04-14</cbc:DueDate>");
    expect(xml).toContain("<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>");
    // Buyer-Reference (Leitweg-ID)
    expect(xml).toContain("<cbc:BuyerReference>04011000-1234512345-06</cbc:BuyerReference>");
    // Abschlag → InvoiceTypeCode 326
    expect(xml).toContain("<cbc:InvoiceTypeCode>326</cbc:InvoiceTypeCode>");
  });

  it("nutzt 380 für Schlussrechnung", () => {
    const ctx = makeContext({ ar: { kind: "schluss", abschlagNo: null } });
    const xml = generateXrechnungXml(ctx);
    expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
  });

  it("schließt PaymentMeans nur ein wenn IBAN da ist", () => {
    const withIban = generateXrechnungXml(makeContext());
    expect(withIban).toContain("<cac:PaymentMeans>");
    expect(withIban).toContain("DE89370400440532013000");

    const withoutIban = generateXrechnungXml(
      makeContext({ workspace: { iban: null } })
    );
    expect(withoutIban).not.toContain("<cac:PaymentMeans>");
  });

  it("rendert PrepaidAmount nur wenn > 0", () => {
    // Default-Context hat 5% Sicherheit → prepaid > 0
    const xml = generateXrechnungXml(makeContext());
    expect(xml).toContain("<cbc:PrepaidAmount");

    const xmlNoPrepaid = generateXrechnungXml(
      makeContext({
        ar: { previousAbschlaegeNet: 0, securityRetentionAmount: 0 },
      })
    );
    expect(xmlNoPrepaid).not.toContain("<cbc:PrepaidAmount");
  });

  it("rendert Adresse mit PLZ-Trennung", () => {
    const xml = generateXrechnungXml(makeContext());
    expect(xml).toContain("<cbc:StreetName>Bauamt 1</cbc:StreetName>");
    expect(xml).toContain("<cbc:PostalZone>50667</cbc:PostalZone>");
    expect(xml).toContain("<cbc:CityName>Köln</cbc:CityName>");
  });

  it("escaped XML-Sonderzeichen in Description", () => {
    const ctx = makeContext({
      positionen: [
        {
          id: "p_x",
          workspaceId: "ws_1",
          ausgangsrechnungId: "ar_1",
          lvItemId: null,
          aufmassZeileId: null,
          oz: null,
          description: "Position mit <Sonderzeichen> & „Anführung\"",
          quantity: 1,
          unit: "Stk",
          unitPrice: 100,
          totalPrice: 100,
          vatPercent: 19,
          sortIndex: 0,
          lpReferenz: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const xml = generateXrechnungXml(ctx);
    expect(xml).not.toContain("<Sonderzeichen>");
    expect(xml).toContain("&lt;Sonderzeichen&gt;");
    expect(xml).toContain("&amp;");
  });
});

describe("mapUnitToUnece", () => {
  it("mapped m² auf MTK", () => {
    expect(mapUnitToUnece("m²")).toBe("MTK");
    expect(mapUnitToUnece("m2")).toBe("MTK");
    expect(mapUnitToUnece("qm")).toBe("MTK");
  });
  it("mapped Stk auf H87", () => {
    expect(mapUnitToUnece("Stk")).toBe("H87");
    expect(mapUnitToUnece("Stück")).toBe("H87");
  });
  it("fällt auf C62 zurück bei unbekannt", () => {
    expect(mapUnitToUnece("xyz")).toBe("C62");
    expect(mapUnitToUnece(null)).toBe("C62");
  });
});
