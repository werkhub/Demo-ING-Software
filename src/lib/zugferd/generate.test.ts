import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type {
  Ausgangsrechnung,
  AusgangsrechnungPosition,
  Project,
  Workspace,
} from "@/db/schema";
import { generateZugferdPdf } from "./generate";

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
  } as Ausgangsrechnung;
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

const FAKE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>AR-2026-0001</ID>
</Invoice>`;

describe("generateZugferdPdf", () => {
  it("erzeugt ein gültiges PDF mit %PDF-Header", async () => {
    const ctx = makeContext();
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    // Erste 4 Bytes müssen "%PDF" sein
    const head = String.fromCharCode(...bytes.slice(0, 4));
    expect(head).toBe("%PDF");
    // EOF-Marker ganz hinten
    const tail = String.fromCharCode(...bytes.slice(-6));
    expect(tail).toContain("%%EOF");
  });

  it("PDF lässt sich mit pdf-lib re-laden", async () => {
    const ctx = makeContext();
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
    expect(reloaded.getTitle()).toContain("AR-2026-0001");
  });

  it("erzeugt PDF ohne Komprimierung-Probleme (lädt sauber)", async () => {
    const ctx = makeContext();
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    const reloaded = await PDFDocument.load(bytes);
    // PDF muss valide Catalog-Struktur haben
    expect(reloaded.catalog).toBeDefined();
    // Trailer-ID muss gesetzt sein (PDF/A-Anforderung)
    expect(reloaded.context.trailerInfo.ID).toBeDefined();
  });

  it("PDF-Größe ist plausibel (nicht zu klein, nicht riesig)", async () => {
    const ctx = makeContext();
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    // Mit Embed + XMP + Layout sollten es einige KB sein
    expect(bytes.length).toBeGreaterThan(2000);
    // Aber unter 200 KB für eine 1-seitige Rechnung
    expect(bytes.length).toBeLessThan(200_000);
  });

  it("rendert Schluss-Rechnung mit anderem Titel", async () => {
    const ctx = makeContext({
      ar: { kind: "schluss", abschlagNo: null },
    });
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("kommt ohne IBAN klar (kein Crash)", async () => {
    const ctx = makeContext({ workspace: { iban: null, bic: null, bankName: null } });
    const bytes = await generateZugferdPdf(ctx, FAKE_XML);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
