import { describe, expect, it } from "vitest";
import { buildLohnBuchungen, buildVerkaufBuchungen } from "./builders";
import type {
  Ausgangsrechnung,
  Mitarbeiter,
  StundenEintrag,
} from "@/db/schema";

const makeAr = (overrides: Partial<Ausgangsrechnung> = {}): Ausgangsrechnung => ({
  id: "ar-1",
  workspaceId: "ws-1",
  projectId: "p-1",
  lvId: null,
  aufmassId: null,
  number: "AR-2024-0001",
  kind: "schluss",
  abschlagNo: null,
  invoiceDate: "2024-01-15",
  serviceStart: null,
  serviceEnd: null,
  dueDate: null,
  skontoPercent: null,
  skontoDays: null,
  vatPercent: 19,
  partyAg: "Müller GmbH",
  partyAgAddress: null,
  partyAn: null,
  partyAnAddress: null,
  partyAnTaxId: null,
  partyAnVatId: null,
  recipientVatId: null,
  recipientIsBauunternehmer: false,
  reverseCharge: false,
  reverseChargeGrund: null,
  subjectLine: "Bauvorhaben Hauptstraße",
  previousAbschlaegeNet: 0,
  securityRetentionPercent: null,
  securityRetentionAmount: 0,
  totalPositionsNet: 1000,
  payoutNet: 1000,
  payoutVat: 190,
  payoutGross: 1190,
  status: "versendet",
  sentAt: new Date(2024, 0, 15),
  paidAt: null,
  paidAmount: null,
  schlusszahlungsVorbehalt: null,
  pdfPath: null,
  buyerReference: null,
  purchaseOrderRef: null,
  xrechnungXmlPath: null,
  xrechnungGeneratedAt: null,
  xrechnungProfile: "x",
  zugferdPdfPath: null,
  zugferdGeneratedAt: null,
  zugferdProfile: "XRECHNUNG",
  hoaiBreakdownJson: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("buildVerkaufBuchungen", () => {
  it("erzeugt eine Buchung pro versendete AR im Zeitraum", () => {
    const ars = [
      makeAr({ id: "a", number: "AR-1", invoiceDate: "2024-01-10" }),
      makeAr({ id: "b", number: "AR-2", invoiceDate: "2024-01-20" }),
    ];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen).toHaveLength(2);
    expect(buchungen[0].belegfeld1).toBe("AR-1");
    expect(buchungen[1].belegfeld1).toBe("AR-2");
  });

  it("filtert AR außerhalb Zeitraum aus", () => {
    const ars = [
      makeAr({ invoiceDate: "2023-12-31" }),
      makeAr({ id: "b", invoiceDate: "2024-01-15" }),
      makeAr({ id: "c", invoiceDate: "2024-02-01" }),
    ];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen).toHaveLength(1);
  });

  it("Entwürfe werden ausgelassen", () => {
    const ars = [makeAr({ status: "entwurf" })];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen).toHaveLength(0);
  });

  it("§13b: vatPercent=0 → erloese_rc_13b-Konto", () => {
    const ars = [makeAr({ vatPercent: 0 })];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen[0].gegenkonto).toBe(8337);
  });

  it("Standard 19% → erloese_19", () => {
    const ars = [makeAr({ vatPercent: 19 })];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen[0].gegenkonto).toBe(8400);
  });

  it("SKR04: Erlös 4400 statt 8400", () => {
    const ars = [makeAr({ vatPercent: 19 })];
    const buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: "skr04",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen[0].gegenkonto).toBe(4400);
  });
});

describe("buildLohnBuchungen", () => {
  const makeMa = (id: string, name: string): Mitarbeiter => ({
    id,
    workspaceId: "ws-1",
    name,
    personalnummer: `P${id}`,
    lohnart: "stunden",
    stundensatzCents: 4500,
    monatsgehaltCents: 0,
    monatsSollStunden: 173.33,
    kostenstelle: null,
    gewerk: null,
    eintrittDatum: null,
    austrittDatum: null,
    aktiv: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeStunde = (
    id: string,
    maId: string,
    datum: string,
    stunden: number
  ): StundenEintrag => ({
    id,
    workspaceId: "ws-1",
    mitarbeiterId: maId,
    projektId: "p-1",
    datum,
    stunden,
    taetigkeit: null,
    lvPositionId: null,
    leistungsphase: null,
    stundensatzCents: 4500,
    gesperrt: false,
    gesperrtAm: null,
    gesperrtVon: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  });

  it("aggregiert Stunden pro Monat × MA", () => {
    const stunden = [
      makeStunde("s1", "ma-1", "2024-01-05", 8),
      makeStunde("s2", "ma-1", "2024-01-12", 8),
      makeStunde("s3", "ma-1", "2024-01-19", 8),
      makeStunde("s4", "ma-2", "2024-01-15", 8),
    ];
    const mitarbeiter = new Map([
      ["ma-1", makeMa("ma-1", "Müller")],
      ["ma-2", makeMa("ma-2", "Schmidt")],
    ]);
    const buchungen = buildLohnBuchungen({
      stunden,
      mitarbeiter,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen).toHaveLength(2);
    const mueller = buchungen.find((b) => b.buchungstext.includes("Müller"));
    expect(mueller?.umsatzEur).toBe(1080); // 24h × 45€
    const schmidt = buchungen.find((b) => b.buchungstext.includes("Schmidt"));
    expect(schmidt?.umsatzEur).toBe(360); // 8h × 45€
  });

  it("filtert außerhalb Zeitraum", () => {
    const stunden = [
      makeStunde("s1", "ma-1", "2023-12-31", 8),
      makeStunde("s2", "ma-1", "2024-02-01", 8),
    ];
    const mitarbeiter = new Map([["ma-1", makeMa("ma-1", "Müller")]]);
    const buchungen = buildLohnBuchungen({
      stunden,
      mitarbeiter,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen).toHaveLength(0);
  });

  it("Konto = aufwand_lohn (4100), Gegenkonto = verbindlichkeit_lohn (1740) bei SKR03", () => {
    const stunden = [makeStunde("s1", "ma-1", "2024-01-15", 8)];
    const mitarbeiter = new Map([["ma-1", makeMa("ma-1", "Müller")]]);
    const buchungen = buildLohnBuchungen({
      stunden,
      mitarbeiter,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-01-31",
    });
    expect(buchungen[0].konto).toBe(4100);
    expect(buchungen[0].gegenkonto).toBe(1740);
  });

  it("Belegfeld 2 = YYYYMM (Lohnmonat)", () => {
    const stunden = [makeStunde("s1", "ma-1", "2024-03-15", 8)];
    const mitarbeiter = new Map([["ma-1", makeMa("ma-1", "Müller")]]);
    const buchungen = buildLohnBuchungen({
      stunden,
      mitarbeiter,
      rahmen: "skr03",
      mappingJson: null,
      zeitraumVon: "2024-01-01",
      zeitraumBis: "2024-12-31",
    });
    expect(buchungen[0].belegfeld2).toBe("202403");
  });
});
