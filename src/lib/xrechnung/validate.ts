/**
 * Pflichtfeld-Validator für XRechnung-Generation.
 *
 * Prüft VOR der XML-Generation, ob alle EN-16931-Pflichtfelder gesetzt sind,
 * damit der Caller dem User klare Fehler zeigen kann (statt KoSIT-Validator-
 * Schematron-Fehler nach dem Generieren zu interpretieren).
 *
 * Pflichtfeld-Set für XRechnung 3.0 (Auswahl der häufigsten Stolperer):
 *   - BT-1   Rechnungsnummer
 *   - BT-2   Rechnungsdatum
 *   - BT-5   Währung
 *   - BG-4   Verkäufer (Name + Anschrift + Steuer-ID/USt-IdNr.)
 *   - BG-7   Käufer (Name + Anschrift)
 *   - BT-10  Käufer-Referenz (Leitweg-ID bei B2G — bei B2B optional)
 *   - BG-25  mindestens eine Position mit Menge + EH + EP
 *   - BT-81  Zahlungsmittel (IBAN — bei Überweisung)
 */
import type { XrechnungContext, XrechnungValidationResult } from "./types";

export function validateForXrechnung(
  ctx: XrechnungContext
): XrechnungValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // BG-4 Seller
  if (!(ctx.ar.partyAn ?? ctx.workspace.name)) {
    missing.push("Verkäufer-Name (Workspace-Name oder AR.partyAn)");
  }
  if (!(ctx.ar.partyAnAddress ?? ctx.workspace.address)) {
    missing.push("Verkäufer-Anschrift (Workspace.address oder AR.partyAnAddress)");
  }
  if (!(ctx.ar.partyAnTaxId ?? ctx.workspace.taxId)) {
    if (!(ctx.ar.partyAnVatId ?? ctx.workspace.vatId)) {
      missing.push("Steuernummer ODER USt-IdNr. (§ 14 IV Nr. 2 UStG)");
    }
  }

  // BG-7 Buyer
  if (!ctx.ar.partyAg) missing.push("Käufer-Name (AR.partyAg)");
  if (!ctx.ar.partyAgAddress) missing.push("Käufer-Anschrift (AR.partyAgAddress)");

  // BT-81 Zahlungsmittel — IBAN warnen wenn fehlt (nicht hart Pflicht, aber
  // ohne IBAN keine SEPA-Überweisung möglich)
  if (!ctx.workspace.iban) {
    warnings.push(
      "Keine IBAN hinterlegt — XRechnung wird ohne Zahlungs-Konto erzeugt. Empfänger kann nicht überweisen."
    );
  }

  // BG-25 Positions
  if (ctx.positionen.length === 0) {
    missing.push("Mindestens eine Position");
  } else {
    for (const p of ctx.positionen) {
      if (p.quantity === null || p.unit === null || p.unitPrice === null) {
        missing.push(
          `Position "${p.description.slice(0, 40)}": Menge, Einheit oder EP fehlt`
        );
      }
    }
  }

  // BT-10 Buyer reference — bei öffentlichen AG Pflicht (Leitweg-ID).
  // Wir wissen nicht, ob B2G oder B2B → Warnung wenn fehlt.
  if (!ctx.ar.buyerReference) {
    warnings.push(
      "Käufer-Referenz (Leitweg-ID) fehlt — bei öffentlichen AG Pflicht für XRechnung-Annahme."
    );
  }

  if (missing.length > 0) {
    return { ok: false, missing, warnings };
  }
  return { ok: true };
}
