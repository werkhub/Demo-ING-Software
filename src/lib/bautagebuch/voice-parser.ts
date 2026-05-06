/**
 * Heuristik-Parser: extrahiert aus einem deutschsprachigen Transkript
 * strukturierte Bautagebuch-Felder.
 *
 * Pure Funktion, keine DB-/Netz-Zugriffe — läuft client- und serverseitig.
 * Bewusst regex-basiert und konservativ: lieber unvollständig erkennen als
 * Mengen erfinden. Phase 1 hängt an dieser Stelle einen LLM-Call (Whisper +
 * Claude) ein, der Heuristik bleibt als Fallback bei Offline / Rate-Limit.
 */

import type {
  Anordnung,
  Anwesender,
  AnwesenderWithConfidence,
  Arbeit,
  Lieferung,
  LieferungWithFlags,
  PlausibilityHint,
  ProjectVoiceContext,
  Vorfall,
  VoiceParseResult,
  WitterungParse,
} from "./voice-types";

/* ------------------------------------------------------------------ */
/* Witterung                                                          */
/* ------------------------------------------------------------------ */

function parseWitterung(text: string): WitterungParse {
  const t = text.toLowerCase();
  const out: WitterungParse = {};

  // Wetter-Wort
  if (/\bsturm|orkan/.test(t)) out.condition = "sturm";
  else if (/\bschnee/.test(t)) out.condition = "schnee";
  else if (/\bfrost|gefroren|minus\s+\d/.test(t)) out.condition = "frost";
  else if (/\bregen|regnet|nass|niederschlag/.test(t)) out.condition = "regen";
  else if (/\bnebel|neblig/.test(t)) out.condition = "nebel";
  else if (/\bbewölkt|wolkig|bedeckt/.test(t)) out.condition = "bewoelkt";
  else if (/\bsonnig|sonne|trocken|heiter|klar/.test(t)) out.condition = "sonnig";

  // Temperatur — "18 Grad", "minus 5 Grad", "20°C"
  const m =
    t.match(/(minus\s+)?(-?\d{1,2})\s*(?:grad|°c|°)/i) ??
    t.match(/(?:bei|um)\s+(-?\d{1,2})\s*grad/i);
  if (m) {
    const sign = m[1] && m[1].includes("minus") ? -1 : 1;
    out.temperatureCelsius = sign * Number(m[2] ?? m[1]);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Stunden eigene/NU-Mannschaft                                       */
/* ------------------------------------------------------------------ */

function parseHours(text: string): { own?: number; subs?: number } {
  const out: { own?: number; subs?: number } = {};
  const t = text.toLowerCase();

  // "X Stunden eigenes Personal" / "X Stunden Eigenleistung"
  const m1 = t.match(/(\d+(?:[.,]\d+)?)\s*stunden?\s+(eigen|eigene\s+mannschaft|eigenleistung)/i);
  if (m1) out.own = Number(m1[1].replace(",", "."));
  // "X Stunden NU" / "X Stunden Nachunternehmer"
  const m2 = t.match(/(\d+(?:[.,]\d+)?)\s*stunden?\s+(nu\b|nachunternehmer|sub)/i);
  if (m2) out.subs = Number(m2[1].replace(",", "."));
  return out;
}

/* ------------------------------------------------------------------ */
/* Anwesende: "Schmitt mit 4 Mann an Trockenbau", "Bauleiter Müller …"*/
/* ------------------------------------------------------------------ */

function parseAnwesende(text: string): Anwesender[] {
  const found: Anwesender[] = [];
  const seen = new Set<string>();

  // Pattern A: "<Firma> mit N Mann an <Gewerk>"
  const reA = /\b([A-ZÄÖÜ][\w-]{2,30})\s+(?:mit|war|sind?|ist)\s+(\d{1,3})\s*(?:mann|leute|personen|mitarbeiter)\b(?:\s+(?:an|am|bei|beim|mit|für|für)?\s+([A-Za-zÄÖÜäöüß][\w\- ]{2,40}?)(?=[,.\n]|$))?/g;
  for (const m of text.matchAll(reA)) {
    const firma = m[1];
    const personen = m[2];
    const gewerk = (m[3] ?? "").trim().replace(/[,.;].*/, "");
    const key = firma.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({
      name: `${firma} (${personen} Mann)`,
      firma,
      funktion: gewerk || "Ausführung",
    });
  }

  // Pattern B: "<Funktion> <Name>" — Bauleiter, Architekt, Polier, AG, Bauherr
  const reB =
    /\b(Bauleiter|Bauleitung|Architekt(?:in)?|Polier|Vorarbeiter|Bauherr|Auftraggeber|AG-Bauleiter|Ingenieur(?:in)?|Sachverständige[rn]?|Prüfer(?:in)?)\s+([A-ZÄÖÜ][\wäöüß]{2,25})\b/g;
  for (const m of text.matchAll(reB)) {
    const funktion = m[1];
    const name = m[2];
    const key = `${funktion.toLowerCase()}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name, funktion });
  }

  return found;
}

/* ------------------------------------------------------------------ */
/* Lieferungen                                                        */
/* ------------------------------------------------------------------ */

function parseLieferungen(text: string): Lieferung[] {
  const out: Lieferung[] = [];

  // "Lieferung <Material> [von <Firma>] [Lieferschein-Nr X]"
  const reLs = /lieferschein(?:[-\s]?nr\.?|\snummer)?\s*[:#]?\s*([A-Z0-9-]{2,15})/gi;
  const lsMatches = [...text.matchAll(reLs)].map((m) => m[1]);

  // Material-Hint: "Lieferung <Material>" / "<Anzahl> <Einheit> <Material> geliefert"
  const reLief = /\blieferung\s+(?:von\s+)?([A-ZÄÖÜ][\wäöüß-]{2,40})(?:\s+von\s+([A-ZÄÖÜ][\wäöüß-]{2,40}))?/gi;
  for (const m of text.matchAll(reLief)) {
    out.push({
      material: m[1],
      lieferant: m[2] ?? "—",
      lieferscheinNr: lsMatches.shift(),
    });
  }

  // Restliche Lieferschein-Nummern ohne Material-Match → eigener Eintrag
  for (const ls of lsMatches) {
    out.push({ lieferant: "—", material: "Lieferung lt. Lieferschein", lieferscheinNr: ls });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Arbeiten — sehr lose, sammelt Verb+Gewerk-Sätze                    */
/* ------------------------------------------------------------------ */

const GEWERKE_KEYWORDS: ReadonlyArray<{ k: RegExp; label: string }> = [
  { k: /trockenbau|gips|gk-?wand|gk-?decke|metallständer/i, label: "Trockenbau" },
  { k: /estrich|fließestrich|zementestrich/i, label: "Estrich" },
  { k: /maurer|mauerwerk|stein/i, label: "Mauerarbeiten" },
  { k: /beton(?:age|ieren)?|stahlbeton|schalung|bewehrung/i, label: "Rohbau / Beton" },
  { k: /fliesen|verfugung/i, label: "Fliesenarbeiten" },
  { k: /maler|streich|spachtel/i, label: "Maler-/Lackier" },
  { k: /elektr(?:o|isch)|verkabel|steckdosen|sicherungskasten/i, label: "Elektro" },
  { k: /sanitär|wasser|abwasser|rohr|spülkasten/i, label: "Sanitär" },
  { k: /heizung|fbh|fußbodenheizung/i, label: "Heizung" },
  { k: /lüftung|klima|tga/i, label: "TGA" },
  { k: /dach(decker|aufbau|abdichtung)?/i, label: "Dach" },
  { k: /fassade|wdvs|verputz|aussenputz/i, label: "Fassade" },
  { k: /fenster|tür(en)?|verglas/i, label: "Fenster / Türen" },
  { k: /erdarbeit|aushub|verfüll|baugrube/i, label: "Erdarbeiten" },
];

function parseArbeiten(text: string): Arbeit[] {
  const out: Arbeit[] = [];
  const seen = new Set<string>();
  // Sätze trennen
  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    // Gewerk-Match
    const g = GEWERKE_KEYWORDS.find((x) => x.k.test(s));
    if (!g) continue;
    // Ignoriere "Anordnungs"-Sätze (separate Pipeline)
    if (/(?:angeordnet|angewiesen|verlangt)/i.test(s)) continue;
    if (/bedenken|behinderung|unfall|beinahe/i.test(s)) continue;
    const key = `${g.label}|${s.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Bauteil-Hint: "im EG", "im 1. OG", "Treppenhaus", "Bad 2"
    const bauteilM = s.match(/\b(EG|UG|OG|KG|Keller|Treppenhaus|Bad\s*\d?|Küche|Wohnzimmer|Flur|Dach(?:geschoss)?|Tiefgarage|Hof|Außenanlage)/i);
    out.push({
      gewerk: g.label,
      bauteil: bauteilM?.[0],
      beschreibung: s.length > 200 ? s.slice(0, 200) + "…" : s,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Anordnungen                                                        */
/* ------------------------------------------------------------------ */

function parseAnordnungen(text: string): Anordnung[] {
  const out: Anordnung[] = [];
  // Sätze, die "angeordnet/angewiesen/verlangt/gefordert" enthalten
  const re = /([^.!?\n]*\b(?:angeordnet|angewiesen|verlangt|gefordert|wünscht|beauftragt)\b[^.!?\n]*[.!?])/gi;
  for (const m of text.matchAll(re)) {
    const satz = m[1].trim();
    // Erteiler heuristisch: vorausgehende Funktion + Name
    const erteilerM =
      satz.match(/\b(Bauleiter|Architekt(?:in)?|Bauherr|Auftraggeber|AG-Bauleiter)\s+([A-ZÄÖÜ][\wäöüß]{2,25})/);
    const erteilerName = erteilerM ? `${erteilerM[1]} ${erteilerM[2]}` : "AG / Bauleitung";

    // Mehrkosten-Trigger: erkennt Worte, die auf zusätzliche / geänderte
    // Leistung hinweisen → Vorbehalt erforderlich.
    const mehrkostenErforderlich = /zusätzlich|mehr|geänder|anders|stattdessen|nachträglich|nochmal/i.test(satz);
    const mehrkostenGesetzt = /vorbehalt|mehrkosten\s*angekündigt|nachtrag\s*angemeldet/i.test(satz);

    out.push({
      erteilerName,
      beschreibung: satz,
      mehrkostenVorbehaltErforderlich: mehrkostenErforderlich,
      mehrkostenVorbehaltGesetzt: mehrkostenGesetzt,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Vorfälle (Sicherheit)                                              */
/* ------------------------------------------------------------------ */

function parseVorfaelle(text: string): Vorfall[] {
  const out: Vorfall[] = [];
  // Sätze mit Trigger
  const re =
    /([^.!?\n]*\b(?:unfall|beinahe[-\s]?unfall|verletzt|verletzung|sturz|gefährdung|gefahr(?:ensituation)?|fast)\b[^.!?\n]*[.!?])/gi;
  for (const m of text.matchAll(re)) {
    const satz = m[1].trim();
    const tLow = satz.toLowerCase();
    let art: Vorfall["art"] = "gefahr";
    if (/beinahe|fast/.test(tLow)) art = "beinahe";
    else if (/unfall|verletzt|verletzung|sturz/.test(tLow)) art = "unfall";

    const personenschaden = /verletzt|verletzung|sturz|krankenhaus|sanitäter/.test(tLow);
    // DGUV-Meldepflicht-Heuristik: bei tatsächlichem Unfall mit Personenschaden
    const dguv = personenschaden && /tag(?:e)?|woche|krankenhaus|arbeitsausfall/.test(tLow);

    out.push({
      art,
      beschreibung: satz,
      personenschaden,
      dguvMeldepflichtig: dguv,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Bedenken / Behinderungen                                           */
/* ------------------------------------------------------------------ */

function parseBedenken(text: string): string[] {
  const out: string[] = [];
  const re =
    /([^.!?\n]*\b(?:bedenken|bedenklich|hingewiesen|wir\s+rügen|wir\s+wiesen)\b[^.!?\n]*[.!?])/gi;
  for (const m of text.matchAll(re)) out.push(m[1].trim());
  return out;
}

function parseBehinderungen(text: string): string[] {
  const out: string[] = [];
  const re =
    /([^.!?\n]*\b(?:behinderung|behindert|stillstand|gestoppt|nicht\s+möglich|kann\s+nicht|verzögerung)\b[^.!?\n]*[.!?])/gi;
  for (const m of text.matchAll(re)) out.push(m[1].trim());
  return out;
}

/* ------------------------------------------------------------------ */
/* Context-Anreicherung                                               */
/* ------------------------------------------------------------------ */

function enrichAnwesende(
  base: Anwesender[],
  ctx: ProjectVoiceContext | null
): AnwesenderWithConfidence[] {
  if (!ctx) return base.map((p) => ({ ...p, matchSource: "new" }));
  return base.map((p) => {
    const haystack = `${p.name} ${p.firma ?? ""}`.toLowerCase();
    const sub = ctx.knownPersons.find(
      (k) => k.source === "subcontractor" && haystack.includes(k.name.toLowerCase())
    );
    if (sub) return { ...p, matchSource: "subcontractor" };
    const hist = ctx.knownPersons.find(
      (k) => k.source === "history" && haystack.includes(k.name.toLowerCase())
    );
    if (hist) return { ...p, matchSource: "history" };
    return { ...p, matchSource: "new" };
  });
}

function enrichLieferungen(
  base: Lieferung[],
  ctx: ProjectVoiceContext | null
): LieferungWithFlags[] {
  if (!ctx) return base;
  // Sammle alle bekannten Lieferschein-Nrs aus Kontext
  const allKnownLs = new Set<string>();
  for (const k of ctx.knownLieferanten) {
    for (const ls of k.knownLieferscheinNrs) allKnownLs.add(ls.toUpperCase());
  }
  return base.map((l) => {
    const knownLieferant = ctx.knownLieferanten.some(
      (k) => k.name.toLowerCase() === l.lieferant.toLowerCase()
    );
    const dup = l.lieferscheinNr
      ? allKnownLs.has(l.lieferscheinNr.toUpperCase())
      : false;
    return {
      ...l,
      knownLieferant,
      duplicateLieferscheinNr: dup,
    };
  });
}

function buildPlausibilityHints(
  arbeiten: Arbeit[],
  ctx: ProjectVoiceContext | null,
  lieferungenWithFlags: LieferungWithFlags[]
): PlausibilityHint[] {
  const hints: PlausibilityHint[] = [];
  if (!ctx) return hints;

  // Gewerke vs. Projekt-Phase
  if (ctx.expectedGewerke.length > 0 && arbeiten.length > 0) {
    const expected = new Set(ctx.expectedGewerke.map((g) => g.toLowerCase()));
    const unerwartet = arbeiten.filter((a) => !expected.has(a.gewerk.toLowerCase()));
    if (unerwartet.length > 0) {
      hints.push({
        level: "warning",
        text: `Gewerk „${unerwartet.map((u) => u.gewerk).join(", ")}" untypisch für Projekt-Phase „${ctx.projectStatus}".`,
      });
    }
  }

  // Lieferschein-Duplikate
  const dups = lieferungenWithFlags.filter((l) => l.duplicateLieferscheinNr);
  if (dups.length > 0) {
    hints.push({
      level: "warning",
      text: `Lieferschein-Nr. „${dups
        .map((d) => d.lieferscheinNr)
        .join(", ")}" in den letzten 30 Tagen schon erfasst — Duplikat?`,
    });
  }

  // Folge-Up-Erinnerung wenn offene Anordnungen bestehen
  if (ctx.openAnordnungen.length > 0) {
    const ohne = ctx.openAnordnungen.filter((a) => !a.vorbehaltGesetzt);
    if (ohne.length > 0) {
      hints.push({
        level: "warning",
        text: `${ohne.length} offene Anordnung(en) ohne Mehrkosten-Vorbehalt aus Vortagen. Heute nachreichen?`,
      });
    }
  }

  return hints;
}

/* ------------------------------------------------------------------ */
/* Hauptfunktion                                                      */
/* ------------------------------------------------------------------ */

export function parseVoiceTranskript(
  transkript: string,
  context: ProjectVoiceContext | null = null
): VoiceParseResult {
  const t = transkript.trim();
  const hours = parseHours(t);
  const anordnungen = parseAnordnungen(t);
  const vorfaelle = parseVorfaelle(t);
  const bedenken = parseBedenken(t);
  const behinderungen = parseBehinderungen(t);
  const lieferungenRaw = parseLieferungen(t);
  const lieferungen = enrichLieferungen(lieferungenRaw, context);
  const anwesendeRaw = parseAnwesende(t);
  // Zusätzlich: bekannte Personen aus Kontext, die im Transkript namentlich
  // erwähnt werden, aber von der Pattern-Erkennung verpasst wurden.
  if (context) {
    const tLow = t.toLowerCase();
    const seenNames = new Set(anwesendeRaw.map((p) => p.name.toLowerCase()));
    for (const k of context.knownPersons) {
      const nameLow = k.name.toLowerCase();
      if (nameLow.length < 3) continue;
      if (seenNames.has(nameLow)) continue;
      // Wort-Boundary-Match auf den Namen
      const re = new RegExp(`\\b${escapeRegex(k.name)}\\b`, "i");
      if (re.test(t) || tLow.includes(nameLow)) {
        anwesendeRaw.push({ name: k.name, firma: k.firma, funktion: k.funktion });
        seenNames.add(nameLow);
      }
    }
  }
  const anwesende = enrichAnwesende(anwesendeRaw, context);

  // Kategorie-Vorschlag: dringendster Anlass gewinnt
  let kategorie: VoiceParseResult["kategorieVorschlag"] = "allgemein";
  let urgency: VoiceParseResult["urgencyVorschlag"] = "info";
  if (vorfaelle.length > 0) {
    kategorie = "mangel";
    urgency = vorfaelle.some((v) => v.personenschaden) ? "critical" : "warning";
  } else if (anordnungen.length > 0) {
    kategorie = "anordnung";
    urgency = anordnungen.some((a) => a.mehrkostenVorbehaltErforderlich && !a.mehrkostenVorbehaltGesetzt)
      ? "critical"
      : "warning";
  } else if (behinderungen.length > 0) {
    kategorie = "behinderung";
    urgency = "warning";
  } else if (bedenken.length > 0) {
    kategorie = "bedenken";
    urgency = "warning";
  } else if (lieferungen.length > 0) {
    kategorie = "lieferung";
  }

  const arbeitenAll = parseArbeiten(t);
  const plausibility = buildPlausibilityHints(arbeitenAll, context, lieferungen);

  return {
    transkript: t,
    witterung: parseWitterung(t),
    staffHoursOwn: hours.own,
    staffHoursSubcontractors: hours.subs,
    anwesende,
    arbeiten: arbeitenAll,
    lieferungen,
    anordnungen,
    vorfaelle,
    bedenken,
    behinderungen,
    kategorieVorschlag: kategorie,
    urgencyVorschlag: urgency,
    plausibility,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/* Demo-Transkript                                                    */
/* ------------------------------------------------------------------ */

export const SAMPLE_VOICE_TRANSKRIPT = `Heute Dienstag der fünfte Mai. Wetter trocken und sonnig, bei achtzehn Grad. 8 Stunden eigene Mannschaft auf der Baustelle, dazu 16 Stunden Nachunternehmer. Schmitt mit vier Mann an Trockenbau im EG, Mertens mit zwei Mann am Estrich im Bad zwei. Lieferung Knauf-Platten heute morgen, Lieferschein-Nr. 4523. Bauleiter Müller war um zehn Uhr da und hat angeordnet die Steckdosen im EG nochmal fünfzig Zentimeter tiefer zu setzen, also nachträglich geänderte Leistung. Beinahe-Unfall bei der Hubarbeitsbühne, Ausleger ist gegen Geländer geschwenkt, kein Personenschaden. Wir wiesen auf Bedenken hin wegen der nicht erkennbaren Trennfuge im Estrich. Foto vom Schaden gemacht.`;
