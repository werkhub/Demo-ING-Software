import { describe, expect, it } from "vitest";
import {
  computeExpiry,
  generatePrueferToken,
  isTokenValid,
  statusToLogAction,
  tokenInvalidReason,
  DEFAULT_VALID_DAYS,
} from "./index";

describe("generatePrueferToken", () => {
  it("liefert UUID v4 (36 Zeichen, Bindestriche, Version 4)", () => {
    const t = generatePrueferToken();
    expect(t).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
  it("liefert je Aufruf einen anderen Token", () => {
    const a = generatePrueferToken();
    const b = generatePrueferToken();
    expect(a).not.toBe(b);
  });
});

describe("computeExpiry", () => {
  it("default = 14 Tage in der Zukunft", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const e = computeExpiry(undefined, from);
    expect(e.getTime() - from.getTime()).toBe(
      DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000
    );
  });
  it("respektiert benutzerdefinierte Tage", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const e = computeExpiry(7, from);
    expect(e.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("isTokenValid", () => {
  const now = new Date("2026-05-01T12:00:00Z");

  it("null → ungültig", () => {
    expect(isTokenValid(null, now)).toBe(false);
  });
  it("Ablauf in Zukunft + nicht widerrufen → gültig", () => {
    expect(
      isTokenValid(
        { expiresAt: new Date("2026-05-15T00:00:00Z"), revokedAt: null },
        now
      )
    ).toBe(true);
  });
  it("widerrufen → ungültig", () => {
    expect(
      isTokenValid(
        {
          expiresAt: new Date("2026-05-15T00:00:00Z"),
          revokedAt: new Date("2026-05-01T11:00:00Z"),
        },
        now
      )
    ).toBe(false);
  });
  it("abgelaufen → ungültig", () => {
    expect(
      isTokenValid(
        { expiresAt: new Date("2026-04-01T00:00:00Z"), revokedAt: null },
        now
      )
    ).toBe(false);
  });
  it("genau jetzt abgelaufen → ungültig (≤)", () => {
    expect(isTokenValid({ expiresAt: now, revokedAt: null }, now)).toBe(false);
  });
});

describe("tokenInvalidReason", () => {
  const now = new Date("2026-05-01T12:00:00Z");
  it("not_found bei null", () => {
    expect(tokenInvalidReason(null, now)).toBe("not_found");
  });
  it("revoked schlägt expired", () => {
    expect(
      tokenInvalidReason(
        {
          expiresAt: new Date("2026-04-01T00:00:00Z"),
          revokedAt: new Date("2026-03-15T00:00:00Z"),
        },
        now
      )
    ).toBe("revoked");
  });
  it("expired wenn nicht widerrufen", () => {
    expect(
      tokenInvalidReason(
        { expiresAt: new Date("2026-04-01T00:00:00Z"), revokedAt: null },
        now
      )
    ).toBe("expired");
  });
  it("null bei gültigem Token", () => {
    expect(
      tokenInvalidReason(
        { expiresAt: new Date("2026-06-01T00:00:00Z"), revokedAt: null },
        now
      )
    ).toBe(null);
  });
});

describe("statusToLogAction", () => {
  it("zugestimmt → approve", () => {
    expect(statusToLogAction("zugestimmt")).toBe("approve");
  });
  it("gekuerzt → reduce", () => {
    expect(statusToLogAction("gekuerzt")).toBe("reduce");
  });
  it("bestritten → dispute", () => {
    expect(statusToLogAction("bestritten")).toBe("dispute");
  });
});
