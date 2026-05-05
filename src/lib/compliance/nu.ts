/**
 * NU-Compliance-Logik (rein, ohne DB-Zugriffe).
 *
 * Pflicht-Bescheinigungen pro Nachunternehmer ergeben sich aus:
 *   § 14 AEntG / § 13 MiLoG  — GU-Haftung Mindestlohn → Eigenerklärung NU
 *   § 48b EStG               — Bauabzugsteuer-Freistellung (ab 5.000 € Auftragswert)
 *   § 28e SGB IV             — KK-Unbedenklichkeit (Sozialabgaben)
 *   § 150 SGB VII            — BG-Bau-Unbedenklichkeit (UV-Beiträge)
 *   TV Sozialkasse Bau       — SOKA-Bau-Unbedenklichkeit (Urlaubs-/Lohnausgleichskasse)
 *   VO (EG) 883/2004         — A1-Bescheinigung bei Entsendung aus EU
 *   GewO/HRG                 — Gewerbeanmeldung / HR-Auszug
 *
 * Einsatz: Server-side für Status-Berechnung, client-side für Anzeige (gleicher Code).
 */
import type {
  ComplianceLevel,
  Subcontractor,
  SubcontractorCertificate,
  SubcontractorCertificateKind,
} from "@/db/schema";

/** Bagatellgrenze § 48b EStG: < 5.000 € Auftragswert → keine Freistellungspflicht. */
export const FREISTELLUNG_48B_THRESHOLD_EUR = 5_000;

/** Vorlauf in Tagen, ab dem eine Bescheinigung als „läuft ab" markiert wird. */
export const EXPIRY_WARN_DAYS = 14;

export const CERTIFICATE_LABELS: Record<SubcontractorCertificateKind, string> = {
  freistellung_48b: "Freistellungsbescheinigung § 48b EStG",
  unbedenklich_finanzamt: "Unbedenklichkeit Finanzamt",
  soka_bau: "SOKA-Bau-Unbedenklichkeit",
  unbedenklich_kk: "Unbedenklichkeit Krankenkasse",
  bg_bau: "BG-Bau-Unbedenklichkeit",
  mindestlohn: "Mindestlohn-Eigenerklärung",
  a1_entsendung: "A1-Bescheinigung (Entsendung)",
  gewerbeanmeldung: "Gewerbeanmeldung / HR-Auszug",
  haftpflicht: "Betriebshaftpflicht-Nachweis",
};

export const CERTIFICATE_LEGAL_BASIS: Record<SubcontractorCertificateKind, string> = {
  freistellung_48b: "§ 48b EStG",
  unbedenklich_finanzamt: "freiwillig (empfohlen)",
  soka_bau: "TV Sozialkasse Bau",
  unbedenklich_kk: "§ 28e SGB IV",
  bg_bau: "§ 150 SGB VII",
  mindestlohn: "§ 13 MiLoG · § 14 AEntG",
  a1_entsendung: "VO (EG) 883/2004",
  gewerbeanmeldung: "§ 14 GewO",
  haftpflicht: "vertraglich",
};

/** Übliche Gültigkeitsdauer in Tagen — UI-Default beim Erfassen. */
export const CERTIFICATE_TYPICAL_VALIDITY_DAYS: Record<
  SubcontractorCertificateKind,
  number
> = {
  freistellung_48b: 365 * 3, // 1–3 Jahre, optimistisch 3
  unbedenklich_finanzamt: 90,
  soka_bau: 90,
  unbedenklich_kk: 90,
  bg_bau: 90,
  mindestlohn: 365,
  a1_entsendung: 365 * 2, // pro Entsendung, max. 24 Monate
  gewerbeanmeldung: 180,
  haftpflicht: 365,
};

/**
 * Welche Bescheinigungen sind für diesen NU Pflicht?
 *
 * Regeln:
 *   - alle Bau-NU brauchen: KK, BG, SOKA, MiLoG, Gewerbeanmeldung
 *   - bei Auftragswert > 5.000 € (§ 48b EStG): Freistellungsbescheinigung
 *   - bei isForeign: zusätzlich A1
 *   - Unbedenklichkeit Finanzamt + Haftpflicht sind „empfohlen" → nicht Pflicht
 */
export function requiredCertificateKinds(
  nu: Pick<Subcontractor, "contractValue" | "isForeign" | "requiresCompliance">
): SubcontractorCertificateKind[] {
  if (!nu.requiresCompliance) return [];
  const required: SubcontractorCertificateKind[] = [
    "unbedenklich_kk",
    "bg_bau",
    "soka_bau",
    "mindestlohn",
    "gewerbeanmeldung",
  ];
  const value = nu.contractValue ?? 0;
  if (value >= FREISTELLUNG_48B_THRESHOLD_EUR) {
    required.push("freistellung_48b");
  }
  if (nu.isForeign) {
    required.push("a1_entsendung");
  }
  return required;
}

/**
 * Welche Bescheinigungs-Arten werden überhaupt angezeigt — Pflicht plus
 * empfohlene (Finanzamt-UB, Haftpflicht). Reihenfolge bestimmt UI-Sortierung.
 */
export function allRelevantKinds(
  nu: Pick<Subcontractor, "contractValue" | "isForeign" | "requiresCompliance">
): SubcontractorCertificateKind[] {
  const required = requiredCertificateKinds(nu);
  const optional: SubcontractorCertificateKind[] = [
    "unbedenklich_finanzamt",
    "haftpflicht",
  ];
  return [...required, ...optional.filter((k) => !required.includes(k))];
}

export function isRequired(
  kind: SubcontractorCertificateKind,
  nu: Pick<Subcontractor, "contractValue" | "isForeign" | "requiresCompliance">
): boolean {
  return requiredCertificateKinds(nu).includes(kind);
}

/** Tage bis zum Ablauf — negativ = bereits abgelaufen. */
export function daysUntilExpiry(
  validUntilIso: string,
  today: Date = new Date()
): number {
  const valid = parseIsoDate(validUntilIso);
  if (!valid) return Number.NaN;
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffMs = valid.getTime() - todayMid.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export type CertificateState = "ok" | "expiring" | "expired";

export function certificateState(
  cert: Pick<SubcontractorCertificate, "validUntil" | "status">,
  today: Date = new Date()
): CertificateState {
  if (cert.status === "abgelaufen" || cert.status === "fehlt") return "expired";
  const days = daysUntilExpiry(cert.validUntil, today);
  if (Number.isNaN(days)) return "expired";
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARN_DAYS) return "expiring";
  return "ok";
}

/**
 * Wählt aus mehreren Bescheinigungen gleicher Art die „aktuelle" — die mit dem
 * spätesten Gültigkeitsende. Tie-Breaker: spätestes issuedAt, dann createdAt.
 */
export function pickLatestPerKind(
  certs: SubcontractorCertificate[]
): Map<SubcontractorCertificateKind, SubcontractorCertificate> {
  const map = new Map<SubcontractorCertificateKind, SubcontractorCertificate>();
  for (const c of certs) {
    const existing = map.get(c.kind);
    if (!existing) {
      map.set(c.kind, c);
      continue;
    }
    if (
      c.validUntil > existing.validUntil ||
      (c.validUntil === existing.validUntil &&
        (c.issuedAt ?? "") > (existing.issuedAt ?? "")) ||
      (c.validUntil === existing.validUntil &&
        (c.issuedAt ?? "") === (existing.issuedAt ?? "") &&
        c.createdAt > existing.createdAt)
    ) {
      map.set(c.kind, c);
    }
  }
  return map;
}

export type ComplianceStatus = {
  level: ComplianceLevel;
  /** Pflicht-Kinds, für die noch GAR KEINE Bescheinigung existiert. */
  missing: SubcontractorCertificateKind[];
  /** Pflicht-Kinds, deren neueste Bescheinigung in <= EXPIRY_WARN_DAYS abläuft. */
  expiring: Array<{
    kind: SubcontractorCertificateKind;
    cert: SubcontractorCertificate;
    daysLeft: number;
  }>;
  /** Pflicht-Kinds, deren neueste Bescheinigung bereits abgelaufen ist. */
  expired: Array<{
    kind: SubcontractorCertificateKind;
    cert: SubcontractorCertificate;
  }>;
  /** Anzahl gültige Pflicht-Bescheinigungen / Anzahl Pflicht-Bescheinigungen. */
  fulfilledCount: number;
  requiredCount: number;
};

/**
 * Berechnet Compliance-Status aus NU-Stammdaten + Bescheinigungs-Liste.
 *
 *   level=critical → Pflicht-Bescheinigung fehlt oder ist abgelaufen
 *                    → Auto-Vorgang, paymentReleaseBlocked = true
 *   level=warning  → mindestens eine Pflicht-Bescheinigung läuft <= 14 Tage ab
 *   level=ok       → alle Pflicht-Bescheinigungen gültig
 *
 * Wenn requiresCompliance=false → immer level=ok (Sonderfall Architekt etc.).
 */
export function computeComplianceStatus(
  nu: Pick<Subcontractor, "contractValue" | "isForeign" | "requiresCompliance">,
  certs: SubcontractorCertificate[],
  today: Date = new Date()
): ComplianceStatus {
  const required = requiredCertificateKinds(nu);
  const latest = pickLatestPerKind(certs);

  const missing: SubcontractorCertificateKind[] = [];
  const expiring: ComplianceStatus["expiring"] = [];
  const expired: ComplianceStatus["expired"] = [];
  let fulfilled = 0;

  for (const kind of required) {
    const cert = latest.get(kind);
    if (!cert) {
      missing.push(kind);
      continue;
    }
    const state = certificateState(cert, today);
    if (state === "expired") {
      expired.push({ kind, cert });
    } else if (state === "expiring") {
      expiring.push({
        kind,
        cert,
        daysLeft: daysUntilExpiry(cert.validUntil, today),
      });
      fulfilled += 1; // gilt noch als erfüllt
    } else {
      fulfilled += 1;
    }
  }

  const level: ComplianceLevel =
    missing.length > 0 || expired.length > 0
      ? "critical"
      : expiring.length > 0
        ? "warning"
        : "ok";

  return {
    level,
    missing,
    expiring,
    expired,
    fulfilledCount: fulfilled,
    requiredCount: required.length,
  };
}

/** UI-Texte für die Compliance-Levels. */
export const COMPLIANCE_LEVEL_LABEL: Record<ComplianceLevel, string> = {
  ok: "Compliance OK",
  warning: "Bescheinigung läuft ab",
  critical: "Compliance-Lücke",
};
