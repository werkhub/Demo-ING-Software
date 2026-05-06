/**
 * Heuristik-Prüfung einer eingehenden Abschlagsrechnung.
 *
 * Pure Funktion ohne IO — nutzbar im Browser für Live-Vorschau und
 * im Server-Action-Pfad für Persistenz. Sobald Phase 1 KI-gestützte LV-/
 * Aufmaß-Matching liefert, bleibt diese Heuristik der deterministische
 * Layer (Rechen-Checks, Formal-Prüfungen).
 */

import type {
  AbschlagInput,
  AbschlagCheckResult,
  CheckFinding,
  PositionStatus,
} from "./types";

/* ---------- Helpers ---------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

const LEVEL_ORDER = { high: 0, medium: 1, info: 2 } as const;

/* ---------- Hauptfunktion ---------- */

export function checkAbschlag(input: AbschlagInput): AbschlagCheckResult {
  const findings: CheckFinding[] = [];
  const positions: PositionStatus[] = [];

  /* ---- 1. Pro-Position-Checks (LV-Match + Aufmaß-Match) ---- */
  let kuerzungAusPositionen = 0;
  let rechnerischeNettosumme = 0;

  for (const p of input.positionen) {
    const summe = p.menge * p.einheitspreis;
    rechnerischeNettosumme += summe;
    const notes: string[] = [];
    let status: PositionStatus["status"] = "ok";

    // LV-Einheitspreis-Vergleich
    if (p.lvEinheitspreis != null) {
      const diff = p.einheitspreis - p.lvEinheitspreis;
      const diffPct = (diff / p.lvEinheitspreis) * 100;
      if (Math.abs(diffPct) > 0.5) {
        const tooHigh = diff > 0;
        const level: CheckFinding["level"] = tooHigh && diffPct > 5 ? "high" : "medium";
        status = tooHigh ? "err" : "warn";
        const k = tooHigh ? (diff * p.menge) : 0;
        kuerzungAusPositionen += k;
        notes.push(
          `EP weicht ${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)} % vom LV ab (${fmtEur(p.einheitspreis)} vs. LV ${fmtEur(p.lvEinheitspreis)}).`
        );
        findings.push({
          level,
          category: "lv_match",
          oz: p.oz,
          title: `EP-Abweichung ${p.oz}`,
          detail: `Position „${p.beschreibung}": Einheitspreis ${fmtEur(p.einheitspreis)} liegt ${tooHigh ? "über" : "unter"} dem LV-Wert ${fmtEur(p.lvEinheitspreis)}. ${tooHigh ? "Differenz zugunsten Lieferant — kürzen." : "Lieferant rechnet günstiger als LV — keine Kürzung, aber prüfen ob Leistung gleichwertig."}`,
          basis: "LV-Vertragsbestandteil · § 2 Abs. 2 VOB/B",
          kuerzungNettoEur: tooHigh ? k : undefined,
        });
      }
    }

    // LV-Mengen-Obergrenze
    if (p.lvMengeMax != null && p.menge > p.lvMengeMax) {
      const ueberMenge = p.menge - p.lvMengeMax;
      const k = ueberMenge * p.einheitspreis;
      kuerzungAusPositionen += k;
      status = "err";
      notes.push(`Menge ${p.menge} ${p.einheit} überschreitet LV-Soll ${p.lvMengeMax} ${p.einheit}.`);
      findings.push({
        level: "high",
        category: "lv_match",
        oz: p.oz,
        title: `Mengen-Überschreitung ${p.oz}`,
        detail: `Abgerechnete Menge ${p.menge} ${p.einheit} übersteigt LV-Vordersatz um ${ueberMenge.toFixed(2)} ${p.einheit}. Bei > 10 % gilt § 2 Abs. 3 Nr. 2 VOB/B (Preisanpassung möglich) — vor Zahlung mit Lieferant klären.`,
        basis: "§ 2 Abs. 3 VOB/B",
        kuerzungNettoEur: k,
      });
    }

    // Aufmaß-Vergleich
    if (p.aufmassMengeIst != null) {
      const diff = p.menge - p.aufmassMengeIst;
      if (Math.abs(diff) > 0.01) {
        const k = Math.max(0, diff) * p.einheitspreis;
        kuerzungAusPositionen += k;
        if (diff > 0) {
          status = status === "ok" ? "warn" : status;
          notes.push(`Abrechnung ${p.menge} > Aufmaß ${p.aufmassMengeIst} ${p.einheit}.`);
          findings.push({
            level: "medium",
            category: "aufmass",
            oz: p.oz,
            title: `Aufmaß-Diskrepanz ${p.oz}`,
            detail: `Lieferant rechnet ${p.menge} ${p.einheit} ab, das Bautagebuch-/Aufmaß-Modul belegt ${p.aufmassMengeIst} ${p.einheit}. Differenz ${diff.toFixed(2)} ${p.einheit} kürzen oder Aufmaß-Nachweis verlangen.`,
            basis: "§ 14 Abs. 2 VOB/B · Aufmaßprotokoll",
            kuerzungNettoEur: k,
          });
        } else {
          notes.push(`Abrechnung ${p.menge} unter Aufmaß ${p.aufmassMengeIst} ${p.einheit} — Lieferant zu Lasten.`);
        }
      }
    }

    positions.push({ oz: p.oz, status, notes });
  }

  /* ---- 2. Summen-Berechnung ---- */
  const ustFaktor = input.istBauleistungNu ? 0 : input.ustSatz / 100;
  const rechnerischeBruttosumme = round2(rechnerischeNettosumme * (1 + ustFaktor));
  // Eingangs-Rechnungs-Brutto wird vom User gegeben — wir nehmen rechnerisch an,
  // dass es == rechnerische Bruttosumme ist (kein expliziter Eingabe-Override
  // im Demo-Modus). Bei manueller Eingabe könnte hier später ein Vergleich rein.
  const rechnungBrutto = rechnerischeBruttosumme;

  /* ---- 3. Sicherheitseinbehalt § 17 VOB/B ---- */
  const sicherheitNetto =
    rechnerischeNettosumme *
    ((input.sicherheitseinbehaltVebProzent + input.sicherheitseinbehaltGlbProzent) / 100);
  const sicherheitBrutto = round2(sicherheitNetto * (1 + ustFaktor));
  if (
    input.sicherheitseinbehaltVebProzent === 0 &&
    input.sicherheitseinbehaltGlbProzent === 0
  ) {
    findings.push({
      level: "info",
      category: "sicherheit",
      title: "Kein Sicherheitseinbehalt konfiguriert",
      detail:
        "Falls vertraglich VEB/GLB vereinbart wurde, hier die jeweiligen Prozentsätze hinterlegen. Üblich: 5 % VEB bei laufenden Abschlägen, 5 % GLB ab Schlussrechnung.",
      basis: "§ 17 VOB/B",
    });
  } else if (input.sicherheitseinbehaltVebProzent > 10) {
    findings.push({
      level: "high",
      category: "sicherheit",
      title: "Sicherheitseinbehalt überzogen",
      detail: `${input.sicherheitseinbehaltVebProzent} % VEB überschreiten die übliche Obergrenze. AGB-Klauseln über 5 % i. d. R. unwirksam (BGH VII ZR 56/15).`,
      basis: "§ 17 VOB/B · BGH VII ZR 56/15",
    });
  }

  /* ---- 4. Bauabzugssteuer § 48 EStG (nur bei NU-Bauleistung) ---- */
  let bauabzug = 0;
  if (input.istBauleistungNu && !input.freistellungsbescheinigungVorhanden) {
    bauabzug = round2(rechnungBrutto * 0.15);
    findings.push({
      level: "high",
      category: "bauabzug",
      title: "Bauabzugssteuer 15 % einbehalten",
      detail: `Lieferant ohne gültige Freistellungsbescheinigung — 15 % der Bruttosumme (${fmtEur(bauabzug)}) sind ans Finanzamt abzuführen, nicht an den Lieferanten.`,
      basis: "§ 48 EStG · § 48b EStG",
    });
  } else if (input.istBauleistungNu && input.freistellungsbescheinigungVorhanden) {
    findings.push({
      level: "info",
      category: "bauabzug",
      title: "Freistellungsbescheinigung berücksichtigt",
      detail: "Kein Bauabzug, da Freistellungsbescheinigung vorliegt. Gültigkeit prüfen — läuft sie während Auftrag aus, wird Einbehalt fällig.",
      basis: "§ 48b EStG",
    });
  }

  /* ---- 5. Reverse-Charge § 13b UStG ---- */
  if (input.istBauleistungNu && input.ustSatz > 0) {
    findings.push({
      level: "high",
      category: "ust",
      title: "USt fälschlich ausgewiesen (§ 13b)",
      detail: `Bei Bauleistungen unter Bauunternehmern greift § 13b UStG (Reverse-Charge). Rechnung darf KEINE USt ausweisen — Lieferant muss korrigierte Rechnung mit „Steuerschuldnerschaft des Leistungsempfängers" senden.`,
      basis: "§ 13b Abs. 2 Nr. 4 UStG",
    });
  } else if (!input.istBauleistungNu && input.ustSatz === 0) {
    findings.push({
      level: "medium",
      category: "ust",
      title: "USt 0 % — § 13b geprüft?",
      detail:
        "Rechnung weist 0 % USt aus, ist aber nicht als § 13b-Bauleistung markiert. Lieferanten-Status (Bauunternehmer? Bauleistung?) verifizieren.",
      basis: "§ 13b UStG",
    });
  }

  /* ---- 6. Kumulativ-Check ---- */
  const auftragssummeBrutto = round2(input.auftragssummeNetto * (1 + ustFaktor));
  const summeNachAbschlag = input.bisherGezahltBrutto + rechnungBrutto;
  if (summeNachAbschlag > auftragssummeBrutto) {
    const ueber = round2(summeNachAbschlag - auftragssummeBrutto);
    findings.push({
      level: "high",
      category: "kumulativ",
      title: "Auftragssumme überschritten",
      detail: `Mit dieser Abschlagsrechnung würde die Summe aller Zahlungen die Auftragssumme um ${fmtEur(ueber)} übersteigen. Vor Freigabe Nachtrag prüfen oder kürzen.`,
      basis: "§ 16 Abs. 1 VOB/B · Vertrag",
      kuerzungNettoEur: round2(ueber / (1 + ustFaktor)),
    });
  } else if (summeNachAbschlag > auftragssummeBrutto * 0.9) {
    findings.push({
      level: "info",
      category: "kumulativ",
      title: "≥ 90 % Auftragssumme erreicht",
      detail: `Nach diesem Abschlag sind ${((summeNachAbschlag / auftragssummeBrutto) * 100).toFixed(1)} % der Auftragssumme abgerechnet. Schlussrechnung absehbar — Sicherheits-Einbehalts-Strategie für GLB vorbereiten.`,
      basis: "§ 14, § 16 VOB/B",
    });
  }

  /* ---- 7. Skonto ---- */
  let skontoMoeglichBis: string | null = null;
  let skontoBetragEur: number | null = null;
  if (input.skontoFristTage && input.skontoProzent && input.rechnungseingangsdatum) {
    skontoMoeglichBis = addDays(input.rechnungseingangsdatum, input.skontoFristTage);
    skontoBetragEur = round2(rechnungBrutto * (input.skontoProzent / 100));
    const heute = new Date().toISOString().slice(0, 10);
    if (heute > skontoMoeglichBis) {
      findings.push({
        level: "medium",
        category: "skonto",
        title: "Skonto-Frist abgelaufen",
        detail: `${input.skontoProzent} % Skonto wären bis ${skontoMoeglichBis} möglich gewesen — heute ${heute}. ${fmtEur(skontoBetragEur)} verloren.`,
        basis: "Vertraglich vereinbart",
      });
    } else {
      findings.push({
        level: "info",
        category: "skonto",
        title: `Skonto bis ${skontoMoeglichBis}`,
        detail: `Bei Zahlung bis ${skontoMoeglichBis} (${input.skontoFristTage} Tage nach Eingang) ${input.skontoProzent} % Skonto = ${fmtEur(skontoBetragEur)} sparbar.`,
        basis: "Vertraglich vereinbart",
      });
    }
  }

  /* ---- 8. § 16 Abs. 1 VOB/B — Prüf- und Zahlungsfrist ---- */
  if (input.rechnungseingangsdatum) {
    const zahlungsZielDate = addDays(input.rechnungseingangsdatum, 21);
    findings.push({
      level: "info",
      category: "frist",
      title: `Zahlungsfrist § 16 Abs. 1: ${zahlungsZielDate}`,
      detail: `21 Tage nach Eingang einer prüfbaren Abschlagsrechnung wird Zahlung fällig. Verzugszinsen ab Tag 22 (Basiszins + 9 % gem. § 288 Abs. 2 BGB).`,
      basis: "§ 16 Abs. 1 Nr. 3 VOB/B · § 288 BGB",
    });
  }

  /* ---- 9. Vertragsstrafe-Verrechnung ---- */
  if (input.vertragsstrafeOffenEur && input.vertragsstrafeOffenEur > 0) {
    findings.push({
      level: "medium",
      category: "vertragsstrafe",
      title: "Vertragsstrafe verrechenbar",
      detail: `${fmtEur(input.vertragsstrafeOffenEur)} offene Vertragsstrafe — Vorbehalt bei Abnahme erforderlich, sonst verfallen (§ 11 Abs. 4 VOB/B). Verrechnung mit dieser Abschlagsrechnung erwägen.`,
      basis: "§ 11 VOB/B · § 14 Abs. 2 VOB/B",
      kuerzungNettoEur: round2(input.vertragsstrafeOffenEur / (1 + ustFaktor)),
    });
  }

  /* ---- 10. Form-Check (Abschlag-Nummer, Lieferant, etc.) ---- */
  if (input.abschlagNr <= 0) {
    findings.push({
      level: "medium",
      category: "form",
      title: "Abschlag-Nummer fehlt / ungültig",
      detail: "Abschlagsrechnungen müssen fortlaufend nummeriert sein.",
      basis: "§ 14 UStG",
    });
  }
  if (!input.rechnungsNr) {
    findings.push({
      level: "high",
      category: "form",
      title: "Rechnungsnummer fehlt",
      detail: "Pflichtangabe nach § 14 Abs. 4 UStG — ohne sie kein Vorsteuerabzug.",
      basis: "§ 14 Abs. 4 UStG",
    });
  }

  /* ---- 11. Zusammenfassen, Kürzungen + Empfehlung ---- */
  // Kürzungen aus per-Position-Findings + ggf. zusätzliche aus Vertragsstrafe/Kumulativ
  const kuerzungAusFindings = findings
    .filter((f) => !["lv_match", "aufmass"].includes(f.category)) // diese sind schon in kuerzungAusPositionen
    .reduce((s, f) => s + (f.kuerzungNettoEur ?? 0), 0);
  const empfohleneKuerzungNetto = round2(kuerzungAusPositionen + kuerzungAusFindings);
  const empfohleneKuerzungBrutto = round2(empfohleneKuerzungNetto * (1 + ustFaktor));

  const zwischensumme = rechnungBrutto - empfohleneKuerzungBrutto;
  const empfohleneZahlungBrutto = round2(
    Math.max(0, zwischensumme - sicherheitBrutto - bauabzug)
  );

  // Score: 100 - 12 pro high - 5 pro medium - 1 pro info, min 0
  let score = 100;
  for (const f of findings) {
    score -= f.level === "high" ? 12 : f.level === "medium" ? 5 : 1;
  }
  score = Math.max(0, Math.min(100, score));

  const decision: AbschlagCheckResult["decision"] =
    score >= 80
      ? "freigeben"
      : score >= 40 || empfohleneKuerzungBrutto > 0
        ? "kuerzen"
        : "ablehnen";

  // Findings nach Schwere sortieren
  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  /* ---- 12. Anschreiben-Entwurf ---- */
  const letterDraftMarkdown = buildLetter({
    input,
    decision,
    empfohleneKuerzungBrutto,
    empfohleneZahlungBrutto,
    sicherheitBrutto,
    bauabzug,
    findings: findings.filter((f) => f.level !== "info").slice(0, 8),
  });

  return {
    positions,
    findings,
    rechnerischeNettosumme: round2(rechnerischeNettosumme),
    rechnerischeBruttosumme,
    rechnungBrutto,
    empfohleneKuerzungNetto,
    empfohleneKuerzungBrutto,
    sicherheitseinbehaltEur: sicherheitBrutto,
    bauabzugsEinbehaltEur: bauabzug,
    bereitsGezahltBrutto: input.bisherGezahltBrutto,
    empfohleneZahlungBrutto,
    skontoMoeglichBis,
    skontoBetragEur,
    decision,
    score,
    letterDraftMarkdown,
  };
}

/* ---------- Anschreiben-Generator ---------- */

function buildLetter(args: {
  input: AbschlagInput;
  decision: AbschlagCheckResult["decision"];
  empfohleneKuerzungBrutto: number;
  empfohleneZahlungBrutto: number;
  sicherheitBrutto: number;
  bauabzug: number;
  findings: CheckFinding[];
}): string {
  const i = args.input;
  const heute = new Date().toLocaleDateString("de-DE");
  if (args.decision === "freigeben") {
    return `Sehr geehrte Damen und Herren,

Ihre Abschlagsrechnung Nr. ${i.rechnungsNr} (${i.abschlagNr}. Abschlag) vom ${i.rechnungsdatum} haben wir geprüft und freigegeben.

Zur Auszahlung kommt — nach Sicherheitseinbehalt von ${fmtEur(args.sicherheitBrutto)} (§ 17 VOB/B)${args.bauabzug > 0 ? ` und Bauabzugssteuer von ${fmtEur(args.bauabzug)} (§ 48 EStG)` : ""} — ein Betrag von **${fmtEur(args.empfohleneZahlungBrutto)}**.

Mit freundlichen Grüßen
${heute}`;
  }

  const lines = args.findings
    .map(
      (f, idx) =>
        `${idx + 1}. **${f.title}**${f.oz ? ` (Pos. ${f.oz})` : ""} — ${f.detail} _Basis: ${f.basis}_`
    )
    .join("\n");

  return `Sehr geehrte Damen und Herren,

Ihre Abschlagsrechnung Nr. ${i.rechnungsNr} (${i.abschlagNr}. Abschlag) vom ${i.rechnungsdatum} haben wir gemäß § 16 Abs. 1 VOB/B geprüft. Folgende Punkte sind vor Auszahlung zu klären bzw. begründen die Kürzung:

${lines}

Wir bitten um Korrektur und Neueinreichung. Bis dahin gilt die Rechnung als nicht prüffähig i. S. d. § 16 Abs. 1 VOB/B; die 21-Tage-Zahlungsfrist beginnt erst mit Eingang der korrigierten Rechnung.

Vorbehaltlich der Klärung käme zur Auszahlung — nach Sicherheitseinbehalt ${fmtEur(args.sicherheitBrutto)}${args.bauabzug > 0 ? ` und Bauabzug ${fmtEur(args.bauabzug)}` : ""} und Kürzung ${fmtEur(args.empfohleneKuerzungBrutto)} — ein Betrag von **${fmtEur(args.empfohleneZahlungBrutto)}**.

Mit freundlichen Grüßen
${heute}`;
}
