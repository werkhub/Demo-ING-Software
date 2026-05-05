import { describe, expect, it } from "vitest";
import {
  allowedNextStates,
  isAllowedTransition,
  isTerminal,
} from "./state-machine";

describe("Mangel state-machine", () => {
  it("erlaubt offen → in_bearbeitung, behoben, abgelehnt, strittig", () => {
    expect(isAllowedTransition("offen", "in_bearbeitung")).toBe(true);
    expect(isAllowedTransition("offen", "behoben")).toBe(true);
    expect(isAllowedTransition("offen", "abgelehnt")).toBe(true);
    expect(isAllowedTransition("offen", "strittig")).toBe(true);
  });

  it("erlaubt in_bearbeitung → behoben, abgelehnt, strittig — nicht zurück nach offen", () => {
    expect(isAllowedTransition("in_bearbeitung", "behoben")).toBe(true);
    expect(isAllowedTransition("in_bearbeitung", "abgelehnt")).toBe(true);
    expect(isAllowedTransition("in_bearbeitung", "strittig")).toBe(true);
    expect(isAllowedTransition("in_bearbeitung", "offen")).toBe(false);
  });

  it("erlaubt strittig → behoben, abgelehnt, in_bearbeitung — nicht zurück nach offen", () => {
    expect(isAllowedTransition("strittig", "behoben")).toBe(true);
    expect(isAllowedTransition("strittig", "abgelehnt")).toBe(true);
    expect(isAllowedTransition("strittig", "in_bearbeitung")).toBe(true);
    expect(isAllowedTransition("strittig", "offen")).toBe(false);
  });

  it("blockiert Re-Open aus terminalen Zuständen", () => {
    expect(isAllowedTransition("behoben", "offen")).toBe(false);
    expect(isAllowedTransition("behoben", "in_bearbeitung")).toBe(false);
    expect(isAllowedTransition("behoben", "strittig")).toBe(false);
    expect(isAllowedTransition("abgelehnt", "offen")).toBe(false);
    expect(isAllowedTransition("abgelehnt", "in_bearbeitung")).toBe(false);
  });

  it("ist idempotent (gleicher Status erlaubt)", () => {
    expect(isAllowedTransition("offen", "offen")).toBe(true);
    expect(isAllowedTransition("behoben", "behoben")).toBe(true);
  });

  it("markiert behoben/abgelehnt als terminal", () => {
    expect(isTerminal("behoben")).toBe(true);
    expect(isTerminal("abgelehnt")).toBe(true);
    expect(isTerminal("offen")).toBe(false);
    expect(isTerminal("in_bearbeitung")).toBe(false);
    expect(isTerminal("strittig")).toBe(false);
  });

  it("listet allowedNextStates korrekt", () => {
    expect(allowedNextStates("offen").sort()).toEqual(
      ["abgelehnt", "behoben", "in_bearbeitung", "strittig"].sort()
    );
    expect(allowedNextStates("behoben")).toEqual([]);
    expect(allowedNextStates("abgelehnt")).toEqual([]);
  });
});
