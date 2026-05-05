/**
 * Heuristik-Analyse einer eingehenden Mängelrüge.
 *
 * Pure Funktion ohne DB- oder Netzwerkcalls — gleichermaßen client- und
 * server-seitig nutzbar. Sobald Phase-1-KI angeschlossen wird, kann diese
 * Heuristik als Fallback erhalten bleiben.
 */

export type RuegeCheck = {
  label: string;
  pass: boolean;
  basis: string;
  detail: string;
};

export type RuegeAnalysisResult = {
  formellPass: boolean;
  materiellLikely: "wahrscheinlich" | "fraglich" | "unwahrscheinlich";
  fristTage: number | null;
  fristAngemessen: boolean | null;
  checks: RuegeCheck[];
  responseDraft: string;
  riskScore: number;
};

export function analyzeRuege(text: string): RuegeAnalysisResult {
  const t = text.trim();
  const checks: RuegeCheck[] = [];

  const hasMangel = /mängel?|risse?|defekt|fehler|undicht|schaden/i.test(t);
  const hasOrt = /\b(treppe|fassade|raum|geschoss|og|eg|kg|bv-?\d|\bobjekt\b|\bbauteil\b)/i.test(t);
  const hasFrist = /frist|tagen?|werktag|wochen?/i.test(t);
  const hasAufforderung =
    /fordern? sie|nachbesseru|beseitigen|herstellen|behebung/i.test(t);

  checks.push({
    label: "Mangel ausreichend bezeichnet",
    pass: hasMangel && hasOrt,
    basis: "§ 13 Abs. 5 VOB/B · BGH VII ZR 80/86",
    detail: hasMangel
      ? hasOrt
        ? "Ja — Mangel-Erscheinung und Lokalisierung erkennbar."
        : "Mangel-Erscheinung erkennbar, Ort/Bauteil unscharf — Konkretisierung anfordern."
      : "Keine konkrete Mangel-Beschreibung erkennbar.",
  });

  checks.push({
    label: "Aufforderung zur Nachbesserung",
    pass: hasAufforderung,
    basis: "§ 13 Abs. 5 VOB/B",
    detail: hasAufforderung
      ? "Ja — eindeutige Aufforderung erkannt."
      : "Keine klare Aufforderung — bloßer Hinweis genügt nicht.",
  });

  const fristMatch = t.match(/\b(\d{1,3})\s*(werktag|tag|woche)/i);
  let fristTage: number | null = null;
  if (fristMatch) {
    const n = Number(fristMatch[1]);
    fristTage = /woche/i.test(fristMatch[2]) ? n * 7 : n;
  }
  const fristAngemessen = fristTage === null ? null : fristTage >= 10;

  checks.push({
    label: "Frist angemessen (≥ 10 Werktage Putz-Nachbesserung)",
    pass: fristAngemessen ?? false,
    basis: "BGH VII ZR 13/16",
    detail:
      fristTage === null
        ? "Frist nicht erkannt — bei fehlender Frist beginnt keine Nachbesserungspflicht."
        : fristAngemessen
          ? `${fristTage} Tage — angemessen für Putz-Nachbesserung.`
          : `Nur ${fristTage} Tage — regelmäßig zu kurz, kann formell gerügt werden.`,
  });

  const hasUnterschrift =
    /mit\s+freundlichen?\s+grüßen|hochachtung|i\.\s*A\./i.test(t);
  checks.push({
    label: "Schriftform / Absender-Identifikation",
    pass: hasUnterschrift,
    basis: "§ 126 BGB · Bauvertrag Ziff. 14",
    detail: hasUnterschrift
      ? "Grußformel + Absender erkennbar."
      : "Keine eindeutige Absender-Signatur — Wirksamkeit fraglich.",
  });

  checks.push({
    label: "Nachweis der Verantwortlichkeit (Beweislast nach Abnahme: AG)",
    pass: false,
    basis: "OLG Köln 11 U 90/16",
    detail:
      "AG muss bei Mängelrüge nach Abnahme beweisen, dass Mangel bereits bei Abnahme angelegt war. Häufig nicht erfüllt.",
  });

  // Hinweis: hasFrist wird derzeit nicht in einen eigenen Check übersetzt, weil
  // fristTage die strengere Antwort liefert. Das Flag bleibt zurückgehalten,
  // wird aber im Frist-Detail mit verwendet.
  void hasFrist;

  const formellPass =
    checks.slice(0, 4).filter((c) => c.pass).length >= 3;
  const materiellLikely: RuegeAnalysisResult["materiellLikely"] = checks[4]
    .pass
    ? "wahrscheinlich"
    : hasMangel && hasAufforderung
      ? "fraglich"
      : "unwahrscheinlich";

  const riskScore = Math.round(
    (checks.filter((c) => c.pass).length / checks.length) * 100
  );

  const responseDraft = buildResponseDraft({
    formellPass,
    fristTage,
    fristAngemessen,
  });

  return {
    formellPass,
    materiellLikely,
    fristTage,
    fristAngemessen,
    checks,
    responseDraft,
    riskScore,
  };
}

export function buildResponseDraft(opts: {
  formellPass: boolean;
  fristTage: number | null;
  fristAngemessen: boolean | null;
}): string {
  const today = new Date().toLocaleDateString("de-DE");
  const newFrist = "14 Werktage";
  const fristAbsatz =
    opts.fristAngemessen === false
      ? `Die von Ihnen gesetzte Frist von ${opts.fristTage} ${opts.fristTage === 1 ? "Werktag" : "Werktagen"} ist nach BGH-Rechtsprechung (BGH VII ZR 13/16) für Putz-Nachbesserungen unangemessen kurz und damit unbeachtlich. Wir setzen vorsorglich eine angemessene Frist von ${newFrist} ab heute.`
      : `Wir nehmen die gesetzte Frist zur Kenntnis und werden uns innerhalb dieser Frist äußern bzw. die erforderlichen Maßnahmen einleiten.`;

  return `Sehr geehrte Damen und Herren,

wir bestätigen den Zugang Ihrer Mängelrüge vom heutigen Tag (${today}).

${fristAbsatz}

VOR Beginn der Nacharbeiten werden wir wie folgt verfahren (Beweissicherung):

· Foto-Dokumentation des IST-Zustands mit Maßstab und Datums-Stempel
· schriftliche Aufforderung an Sie, einen öffentlich bestellten und vereidigten Sachverständigen zur Beweissicherung zu benennen (Termin innerhalb 5 Werktagen)
· Auszug aus dem Bautagebuch der Ausführungsphase
· Prüfung der AG-seitigen Vorleistungen (Untergrund, Anweisungen)

Soweit sich nach dieser Beweissicherung herausstellt, dass die Ursache der gerügten Erscheinungen nicht in unserem Verantwortungsbereich liegt, behalten wir uns die Geltendmachung von Kosten gegenüber Ihnen vor.

Bis zur Klärung des Verantwortungsbereichs erfolgt die Nachbesserung — sofern wir sie ausführen — unter Vorbehalt der Kostentragung.

Wir bitten um Bestätigung, dass Sie bis zur Beweissicherung keine Selbstvornahme nach § 13 Abs. 5 VOB/B durchführen.

Mit freundlichen Grüßen`;
}
