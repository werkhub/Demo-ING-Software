import { describe, expect, it } from "vitest";
import { detectFormat, parseErechnungXml } from "./parser";
import { validate } from "./validator";

const UBL_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ID>RE-2026-0001</cbc:ID>
  <cbc:IssueDate>2026-03-15</cbc:IssueDate>
  <cbc:DueDate>2026-04-14</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Müller GmbH</cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Müller GmbH</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>DE123456789</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Bauherr AG</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">190.00</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">1190.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">1190.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="H87">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Trockenbau-Wand</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

const CII_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>NU-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <ram:DateTimeString format="102">20260315</ram:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Maurerarbeiten</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>50.00</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">20</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>NU GmbH</ram:Name>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">DE987654321</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Hauptauftragnehmer GmbH</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>1000.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">190.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1190.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>1190.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

describe("erechnung/detectFormat", () => {
  it("erkennt XRechnung UBL", () => {
    expect(detectFormat(UBL_FIXTURE)).toBe("xrechnung_ubl");
  });
  it("erkennt CII (mit GuidelineSpecified)", () => {
    expect(detectFormat(CII_FIXTURE)).toBe("zugferd");
  });
  it("liefert unbekannt für Müll", () => {
    expect(detectFormat("<root><foo/></root>")).toBe("unbekannt");
  });
});

describe("erechnung/parseErechnungXml UBL", () => {
  it("parsed Header", () => {
    const r = parseErechnungXml(UBL_FIXTURE);
    expect(r.format).toBe("xrechnung_ubl");
    expect(r.rechnungsnr).toBe("RE-2026-0001");
    expect(r.rechnungsdatum).toBe("2026-03-15");
    expect(r.faelligkeit).toBe("2026-04-14");
    expect(r.waehrung).toBe("EUR");
    expect(r.rechnungstyp).toBe("380");
  });
  it("parsed Lieferant + USt-ID", () => {
    const r = parseErechnungXml(UBL_FIXTURE);
    expect(r.lieferantName).toBe("Müller GmbH");
    expect(r.lieferantUstId).toBe("DE123456789");
  });
  it("parsed Beträge in Cents", () => {
    const r = parseErechnungXml(UBL_FIXTURE);
    expect(r.gesamtNettoCents).toBe(100000);
    expect(r.gesamtUstCents).toBe(19000);
    expect(r.bruttoSummeCents).toBe(119000);
    expect(r.zahlbarSummeCents).toBe(119000);
  });
  it("parsed Position", () => {
    const r = parseErechnungXml(UBL_FIXTURE);
    expect(r.positionen).toHaveLength(1);
    expect(r.positionen[0].bezeichnung).toBe("Trockenbau-Wand");
    expect(r.positionen[0].menge).toBe(10);
    expect(r.positionen[0].einheit).toBe("H87");
    expect(r.positionen[0].einzelpreisCents).toBe(10000);
    expect(r.positionen[0].summeNettoCents).toBe(100000);
  });
});

describe("erechnung/parseErechnungXml CII", () => {
  it("parsed Header", () => {
    const r = parseErechnungXml(CII_FIXTURE);
    expect(r.rechnungsnr).toBe("NU-001");
    expect(r.rechnungsdatum).toBe("2026-03-15");
    expect(r.waehrung).toBe("EUR");
  });
  it("parsed Lieferant", () => {
    const r = parseErechnungXml(CII_FIXTURE);
    expect(r.lieferantName).toBe("NU GmbH");
    expect(r.lieferantUstId).toBe("DE987654321");
  });
  it("parsed Käufer", () => {
    const r = parseErechnungXml(CII_FIXTURE);
    expect(r.kaeuferName).toBe("Hauptauftragnehmer GmbH");
  });
  it("parsed Beträge", () => {
    const r = parseErechnungXml(CII_FIXTURE);
    expect(r.gesamtNettoCents).toBe(100000);
    expect(r.gesamtUstCents).toBe(19000);
    expect(r.bruttoSummeCents).toBe(119000);
  });
  it("parsed Position", () => {
    const r = parseErechnungXml(CII_FIXTURE);
    expect(r.positionen).toHaveLength(1);
    expect(r.positionen[0].bezeichnung).toBe("Maurerarbeiten");
    expect(r.positionen[0].menge).toBe(20);
  });
});

describe("erechnung/validate", () => {
  it("validUBL = valid", () => {
    const r = validate(parseErechnungXml(UBL_FIXTURE));
    expect(r.status).toBe("valid");
    expect(r.errors).toHaveLength(0);
  });
  it("validCII = valid", () => {
    const r = validate(parseErechnungXml(CII_FIXTURE));
    expect(r.status).toBe("valid");
  });
  it("ohne Rechnungsnr → invalid", () => {
    const r = validate({
      format: "xrechnung_ubl",
      rechnungsnr: null,
      rechnungsdatum: "2024-01-15",
      rechnungstyp: "380",
      waehrung: "EUR",
      faelligkeit: null,
      lieferantName: "X",
      lieferantUstId: "DE1",
      kaeuferName: "Y",
      summePositionenNettoCents: 100,
      gesamtNettoCents: 100,
      gesamtUstCents: 19,
      bruttoSummeCents: 119,
      zahlbarSummeCents: 119,
      positionen: [],
    });
    expect(r.status).toBe("invalid");
    expect(r.errors.some((e) => e.includes("BT-1"))).toBe(true);
  });
  it("Brutto ≠ Netto+USt → warning", () => {
    const r = validate({
      format: "xrechnung_ubl",
      rechnungsnr: "X",
      rechnungsdatum: "2024-01-15",
      rechnungstyp: "380",
      waehrung: "EUR",
      faelligkeit: null,
      lieferantName: "X",
      lieferantUstId: "DE1",
      kaeuferName: "Y",
      summePositionenNettoCents: 100000,
      gesamtNettoCents: 100000,
      gesamtUstCents: 19000,
      bruttoSummeCents: 120000, // 1000 cent off
      zahlbarSummeCents: 120000,
      positionen: [],
    });
    expect(r.status).toBe("warnings");
    expect(r.warnings.some((w) => w.includes("Plausi"))).toBe(true);
  });
});
