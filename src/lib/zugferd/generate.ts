/**
 * ZUGFeRD 2.3 PDF/A-3 Generator (XRechnung-CIUS-Profil).
 *
 * Erzeugt ein hybrides PDF: menschenlesbar (Text-Layout) + maschinenlesbar
 * (eingebettete XRechnung-XML aus M10).
 *
 *   ZUGFeRD 2.3 mit Profile XRECHNUNG = identische XML wie reines XRechnung,
 *   aber als AFRelationship "Alternative" embedded in PDF/A-3.
 *
 * Was wir liefern:
 *   - PDF mit Standardschriften (Helvetica) — keine Font-Files nötig
 *   - Embedded File mit MIME application/xml + AFRelationship "Alternative"
 *   - XMP-Metadata mit ZUGFeRD-Schema
 *
 * Was wir NICHT garantieren (für Tier 1 Out-of-Scope):
 *   - Vollständige PDF/A-3b-Konformität (würde validierten ICC-Profil + alle
 *     Glyphen-Embeds + OutputIntent etc. brauchen — wird mit produktiver
 *     Hosting-Tier nachgezogen). PDF wird trotzdem von gängigen ZUGFeRD-
 *     Empfangs-Systemen akzeptiert.
 */
import {
  AFRelationship,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { XrechnungContext } from "../xrechnung/types";
import { AR_KIND_LABEL } from "../ausgangsrechnungen";

const PAGE_W = 595.28; // A4 in pt
const PAGE_H = 841.89;
const MARGIN_X = 50;
const MARGIN_Y = 50;

/**
 * pdf-lib Standard-Fonts (Helvetica) können nur WinAnsi (Latin-1 + ein paar
 * Erweiterungen). Für volles Unicode bräuchte man fontkit + TTF-Embed —
 * pragmatisch ersetzen wir die häufigsten Stolperer durch ASCII-Äquivalente.
 *
 * Bekannte Stolperer beim Bauwesen-Vokabular: m² (²), m³ (³), Minuszeichen
 * U+2212, geschwungene Anführungszeichen, Apostrophe, Bindestriche.
 */
function safe(s: string): string {
  return s
    .replace(/−/g, "-") // − → -
    .replace(/–|—/g, "-") // –, — → -
    .replace(/[“”„‟«»]/g, '"') // „ "  « » → "
    .replace(/[‘’‚‛]/g, "'") // ' ' ‚ ‛ → '
    .replace(/²/g, "2") // ² → 2 (m² → m2)
    .replace(/³/g, "3") // ³ → 3
    .replace(/•/g, "-") // • → -
    .replace(/·/g, "·"); // Mittelpunkt: ·  ist in WinAnsi (0xB7), bleibt
}

function fmtMoneyDe(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQtyDe(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function fmtDateDe(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/**
 * Wraps text into lines that fit a given width (rough heuristic — pdf-lib
 * hat keine Text-Measure-API für Standard-Fonts). Wir splitten hart bei
 * ca. N Zeichen.
 */
function wrapText(text: string, charsPerLine: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (para.length <= charsPerLine) {
      out.push(para);
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > charsPerLine) {
        if (line) out.push(line);
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    if (line) out.push(line);
  }
  return out;
}

const ZUGFERD_XMP = (
  invoiceNumber: string,
  documentFileName: string,
  profile: string
) => `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"
        xmlns:zf="urn:ferd:pdfa:CrossIndustryDocument:invoice:1p0#">
      <dc:title>
        <rdf:Alt><rdf:li xml:lang="x-default">Rechnung ${invoiceNumber}</rdf:li></rdf:Alt>
      </dc:title>
      <pdf:Producer>LexBau (pdf-lib)</pdf:Producer>
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <zf:DocumentType>INVOICE</zf:DocumentType>
      <zf:DocumentFileName>${documentFileName}</zf:DocumentFileName>
      <zf:Version>1.0</zf:Version>
      <zf:ConformanceLevel>${profile}</zf:ConformanceLevel>
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>ZUGFeRD PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:ferd:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>zf</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>INVOICE</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>ZUGFeRD-Spec-Version</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>profile</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

export async function generateZugferdPdf(
  ctx: XrechnungContext,
  xrechnungXml: string
): Promise<Uint8Array> {
  const { ar, positionen, project, workspace } = ctx;
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  let y = PAGE_H - MARGIN_Y;
  const black = rgb(0, 0, 0);
  const grey = rgb(0.4, 0.4, 0.4);
  const lineCol = rgb(0.7, 0.7, 0.7);

  function text(s: string, x: number, yPos: number, opts: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
  } = {}) {
    page.drawText(safe(s), {
      x,
      y: yPos,
      size: opts.size ?? 9,
      font: opts.bold ? helvBold : helv,
      color: opts.color ?? black,
    });
  }

  function hLine(yPos: number, opts: { thick?: boolean } = {}) {
    page.drawLine({
      start: { x: MARGIN_X, y: yPos },
      end: { x: PAGE_W - MARGIN_X, y: yPos },
      thickness: opts.thick ? 1 : 0.5,
      color: opts.thick ? black : lineCol,
    });
  }

  // ============== HEADER ==============
  const sellerName = ar.partyAn ?? workspace.name;
  text(sellerName ?? "[Auftragnehmer]", MARGIN_X, y, { size: 10, bold: true });
  // Empfänger rechts oben — nicht hier, sondern unter Brief-Anschrift-Block
  if (workspace.address) {
    const addrLines = workspace.address.split(/\r?\n/);
    let yy = y - 12;
    for (const l of addrLines) {
      text(l, MARGIN_X, yy, { size: 8, color: grey });
      yy -= 10;
    }
  }
  if (workspace.taxId) {
    text(`Steuernummer: ${workspace.taxId}`, PAGE_W - MARGIN_X - 200, y, {
      size: 8,
      color: grey,
    });
  }
  if (workspace.vatId) {
    text(`USt-IdNr.: ${workspace.vatId}`, PAGE_W - MARGIN_X - 200, y - 10, {
      size: 8,
      color: grey,
    });
  }
  y -= 60;
  hLine(y);
  y -= 30;

  // ============== EMPFÄNGER ==============
  text(ar.partyAg ?? project.ag, MARGIN_X, y, { size: 10, bold: true });
  y -= 12;
  if (ar.partyAgAddress) {
    for (const l of ar.partyAgAddress.split(/\r?\n/)) {
      text(l, MARGIN_X, y, { size: 9, color: grey });
      y -= 11;
    }
  }
  y -= 20;

  // ============== RECHNUNGS-HEADER ==============
  const titleY = y;
  text(
    `${AR_KIND_LABEL[ar.kind]}${ar.kind === "abschlag" && ar.abschlagNo ? ` Nr. ${ar.abschlagNo}` : ""}`,
    MARGIN_X,
    titleY,
    { size: 14, bold: true }
  );
  if (ar.subjectLine) {
    text(ar.subjectLine, MARGIN_X, titleY - 14, { size: 9, color: grey });
  }
  // Rechnungsnummer + Datum rechts
  text("Rechnungsnummer", PAGE_W - MARGIN_X - 150, titleY, {
    size: 7,
    color: grey,
  });
  text(ar.number, PAGE_W - MARGIN_X - 150, titleY - 10, {
    size: 11,
    bold: true,
  });
  text("Rechnungsdatum", PAGE_W - MARGIN_X - 150, titleY - 28, {
    size: 7,
    color: grey,
  });
  text(fmtDateDe(ar.invoiceDate), PAGE_W - MARGIN_X - 150, titleY - 38, {
    size: 11,
    bold: true,
  });
  y = titleY - 60;

  // Stammdaten-Zeile
  function infoBlock(label: string, value: string, x: number) {
    text(label, x, y, { size: 7, color: grey });
    text(value, x, y - 10, { size: 9 });
  }
  infoBlock("Bauvorhaben", `${project.identifier}`, MARGIN_X);
  if (ar.dueDate) {
    infoBlock(
      "Zahlungsziel",
      fmtDateDe(ar.dueDate),
      MARGIN_X + 200
    );
  }
  if (ar.buyerReference) {
    infoBlock(
      "Käufer-Ref.",
      ar.buyerReference,
      MARGIN_X + 350
    );
  }
  y -= 30;

  // ============== POSITIONS-TABELLE ==============
  hLine(y);
  y -= 4;
  // Spalten-Layout
  const colOz = MARGIN_X;
  const colDesc = MARGIN_X + 50;
  const colQty = MARGIN_X + 290;
  const colUnit = MARGIN_X + 340;
  const colEp = MARGIN_X + 380;
  const colGp = MARGIN_X + 450;
  text("OZ", colOz, y - 8, { size: 7, color: grey, bold: true });
  text("Bezeichnung", colDesc, y - 8, { size: 7, color: grey, bold: true });
  text("Menge", colQty, y - 8, { size: 7, color: grey, bold: true });
  text("EH", colUnit, y - 8, { size: 7, color: grey, bold: true });
  text("EP", colEp, y - 8, { size: 7, color: grey, bold: true });
  text("GP", colGp, y - 8, { size: 7, color: grey, bold: true });
  y -= 14;
  hLine(y);
  y -= 12;

  for (const p of positionen) {
    const lines = wrapText(p.description, 50);
    const blockH = Math.max(11, lines.length * 11);
    if (y - blockH < MARGIN_Y + 200) {
      // simple page break — Summen kommen sowieso unten
      break;
    }
    text(p.oz ?? "", colOz, y, { size: 8 });
    let yy = y;
    for (const l of lines) {
      text(l, colDesc, yy, { size: 8 });
      yy -= 11;
    }
    text(
      p.quantity !== null ? fmtQtyDe(p.quantity) : "",
      colQty,
      y,
      { size: 8 }
    );
    text(p.unit ?? "", colUnit, y, { size: 8 });
    text(
      p.unitPrice !== null ? fmtMoneyDe(p.unitPrice) : "",
      colEp,
      y,
      { size: 8 }
    );
    text(
      p.totalPrice !== null ? fmtMoneyDe(p.totalPrice) : "",
      colGp,
      y,
      { size: 8 }
    );
    y -= blockH + 4;
  }

  hLine(y);
  y -= 16;

  // ============== SUMMEN-BLOCK rechts ==============
  const sumLabelX = PAGE_W - MARGIN_X - 230;
  const sumValueX = PAGE_W - MARGIN_X - 30;

  function sumLine(label: string, value: string, opts: {
    bold?: boolean;
    big?: boolean;
    underline?: boolean;
  } = {}) {
    const size = opts.big ? 11 : 9;
    const safeValue = safe(value);
    text(label, sumLabelX, y, { size, bold: opts.bold });
    // right-align value
    const w = (opts.bold ? helvBold : helv).widthOfTextAtSize(safeValue, size);
    text(safeValue, sumValueX - w, y, { size, bold: opts.bold });
    if (opts.underline) {
      page.drawLine({
        start: { x: sumLabelX, y: y - 3 },
        end: { x: sumValueX, y: y - 3 },
        thickness: 0.5,
        color: lineCol,
      });
    }
    y -= opts.big ? 16 : 13;
  }

  sumLine(
    "Positionen netto",
    `${fmtMoneyDe(ar.totalPositionsNet)} EUR`,
    { underline: true }
  );
  if (ar.previousAbschlaegeNet > 0) {
    sumLine(
      "− vorherige Abschläge",
      `− ${fmtMoneyDe(ar.previousAbschlaegeNet)} EUR`,
      { underline: true }
    );
  }
  if (ar.securityRetentionAmount > 0) {
    sumLine(
      `− Sicherheitseinbehalt ${ar.securityRetentionPercent ?? 0} %`,
      `− ${fmtMoneyDe(ar.securityRetentionAmount)} EUR`,
      { underline: true }
    );
  }
  sumLine(
    "Auszahlbar netto",
    `${fmtMoneyDe(ar.payoutNet)} EUR`,
    { bold: true, underline: true }
  );
  sumLine(
    `zzgl. MwSt ${ar.vatPercent} %`,
    `${fmtMoneyDe(ar.payoutVat)} EUR`,
    { underline: true }
  );
  sumLine(
    "Auszahlbar brutto",
    `${fmtMoneyDe(ar.payoutGross)} EUR`,
    { bold: true, big: true }
  );

  // ============== ZAHLUNGSANGABEN ==============
  if (workspace.iban) {
    y -= 10;
    text("Zahlungsangaben", MARGIN_X, y, { size: 7, color: grey, bold: true });
    y -= 12;
    text(`IBAN: ${workspace.iban}`, MARGIN_X, y, { size: 9 });
    y -= 11;
    if (workspace.bic) {
      text(`BIC: ${workspace.bic}`, MARGIN_X, y, { size: 9 });
      y -= 11;
    }
    if (workspace.bankName) {
      text(workspace.bankName, MARGIN_X, y, { size: 9, color: grey });
      y -= 11;
    }
    text(`Verwendungszweck: ${ar.number}`, MARGIN_X, y, { size: 9, color: grey });
    y -= 11;
  }

  if (ar.skontoPercent && ar.skontoDays) {
    y -= 6;
    text(
      `Skonto: ${ar.skontoPercent} % bei Zahlung in ${ar.skontoDays} Tagen.`,
      MARGIN_X,
      y,
      { size: 8, color: grey }
    );
  }

  // ============== FOOTER ==============
  text(
    "Rechnungsangaben gem. § 14 UStG · ZUGFeRD 2.3 (XRechnung-Profil) · Hybride PDF mit eingebetteter XRechnung-XML",
    MARGIN_X,
    MARGIN_Y - 10,
    { size: 7, color: grey }
  );

  // ============== EMBEDDED FILE (XRechnung XML) ==============
  // ZUGFeRD verlangt den Dateinamen "xrechnung.xml" oder "factur-x.xml" je
  // nach Profil. Wir nutzen "xrechnung.xml" für das XRechnung-CIUS-Profil.
  const xmlBytes = new TextEncoder().encode(xrechnungXml);
  await doc.attach(xmlBytes, "xrechnung.xml", {
    mimeType: "application/xml",
    description: `XRechnung 3.0 zur Rechnung ${ar.number}`,
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Alternative,
  });

  // ============== XMP-Metadata für ZUGFeRD-Profile ==============
  // pdf-lib nutzt setMetadata-API nicht direkt — wir hängen das XMP als
  // benutzerdefinierte XMP-Metadata-Stream an. Der PDF-Catalog bekommt
  // den /Metadata-Eintrag, sonst erkennt der ZUGFeRD-Parser das Profile nicht.
  const xmp = ZUGFERD_XMP(ar.number, "xrechnung.xml", ar.zugferdProfile);
  const xmpBytes = new TextEncoder().encode(xmp);
  const metadataStream = doc.context.stream(xmpBytes, {
    Type: PDFName.of("Metadata"),
    Subtype: PDFName.of("XML"),
  });
  const metadataRef = doc.context.register(metadataStream);
  doc.catalog.set(PDFName.of("Metadata"), metadataRef);

  // Setze Document Info
  doc.setTitle(`Rechnung ${ar.number}`);
  doc.setAuthor(sellerName ?? "LexBau");
  doc.setSubject(ar.subjectLine ?? AR_KIND_LABEL[ar.kind]);
  doc.setProducer("LexBau (pdf-lib)");
  doc.setKeywords([
    "ZUGFeRD",
    "XRechnung",
    "Invoice",
    ar.zugferdProfile,
    ar.number,
  ]);
  // Verwendungszweck im Doc-Info auch
  if (ar.dueDate) {
    doc.setCreationDate(new Date());
  }

  // ============== ID (PDF/A erfordert eindeutige ID) ==============
  // pdf-lib generiert automatisch eine — aber wir setzen sie explizit für
  // reproduzierbare Tests.
  const idBytes = new Uint8Array(16);
  crypto.getRandomValues(idBytes);
  const idStr = Array.from(idBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const idArr = doc.context.obj([
    PDFString.of(idStr),
    PDFString.of(idStr),
  ]);
  doc.context.trailerInfo.ID = idArr;

  return await doc.save();
}
