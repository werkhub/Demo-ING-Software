import { describe, expect, it } from "vitest";
import {
  categorizeLabel,
  incrementAlphabetic,
  incrementNumeric,
  indexSortKey,
  isValidIndexLabel,
  nextIndexLabel,
  sortIndexLabels,
} from "./index-label";

describe("plaene/categorizeLabel", () => {
  it("alphabetisch → entwurf", () => {
    expect(categorizeLabel("A")).toBe("entwurf");
    expect(categorizeLabel("Z")).toBe("entwurf");
    expect(categorizeLabel("AA")).toBe("entwurf");
    expect(categorizeLabel("aa")).toBe("entwurf");
  });
  it("numerisch → freigegeben", () => {
    expect(categorizeLabel("0")).toBe("freigegeben");
    expect(categorizeLabel("12")).toBe("freigegeben");
  });
  it("leer → freigegeben (Default)", () => {
    expect(categorizeLabel("")).toBe("freigegeben");
    expect(categorizeLabel("  ")).toBe("freigegeben");
  });
  it("gemischt → freigegeben (Default)", () => {
    expect(categorizeLabel("A1")).toBe("freigegeben");
  });
});

describe("plaene/incrementAlphabetic", () => {
  it("A → B, B → C", () => {
    expect(incrementAlphabetic("A")).toBe("B");
    expect(incrementAlphabetic("B")).toBe("C");
  });
  it("Z → AA", () => {
    expect(incrementAlphabetic("Z")).toBe("AA");
  });
  it("AZ → BA", () => {
    expect(incrementAlphabetic("AZ")).toBe("BA");
  });
  it("AA → AB", () => {
    expect(incrementAlphabetic("AA")).toBe("AB");
  });
  it("ZZ → AAA", () => {
    expect(incrementAlphabetic("ZZ")).toBe("AAA");
  });
  it("Lowercase wird zu Uppercase", () => {
    expect(incrementAlphabetic("a")).toBe("B");
  });
});

describe("plaene/incrementNumeric", () => {
  it("0 → 1, 9 → 10, 99 → 100", () => {
    expect(incrementNumeric("0")).toBe("1");
    expect(incrementNumeric("9")).toBe("10");
    expect(incrementNumeric("99")).toBe("100");
  });
  it("kaputter String → 0", () => {
    expect(incrementNumeric("foo")).toBe("0");
  });
});

describe("plaene/nextIndexLabel", () => {
  it("Entwurf — leer → A", () => {
    expect(nextIndexLabel([], "entwurf")).toBe("A");
  });
  it("Entwurf — A vorhanden → B", () => {
    expect(nextIndexLabel(["A"], "entwurf")).toBe("B");
  });
  it("Entwurf — A,B,C vorhanden → D", () => {
    expect(nextIndexLabel(["A", "B", "C"], "entwurf")).toBe("D");
  });
  it("Entwurf — gemischt mit numerischen ignoriert die numerischen", () => {
    expect(nextIndexLabel(["A", "B", "0", "1"], "entwurf")).toBe("C");
  });
  it("Entwurf — Z → AA", () => {
    expect(nextIndexLabel(["Z"], "entwurf")).toBe("AA");
  });

  it("Freigegeben — leer → 0", () => {
    expect(nextIndexLabel([], "freigegeben")).toBe("0");
  });
  it("Freigegeben — 0,1,2 → 3", () => {
    expect(nextIndexLabel(["0", "1", "2"], "freigegeben")).toBe("3");
  });
  it("Freigegeben — 9 → 10", () => {
    expect(nextIndexLabel(["9"], "freigegeben")).toBe("10");
  });
  it("Freigegeben — gemischt mit Buchstaben ignoriert Buchstaben", () => {
    expect(nextIndexLabel(["A", "B", "0"], "freigegeben")).toBe("1");
  });
  it("Freigegeben — Lücken werden ignoriert (max + 1)", () => {
    expect(nextIndexLabel(["0", "5", "3"], "freigegeben")).toBe("6");
  });
});

describe("plaene/indexSortKey + sortIndexLabels", () => {
  it("Entwurf vor Freigegeben", () => {
    const sorted = sortIndexLabels(["1", "A", "0", "B"]);
    expect(sorted).toEqual(["A", "B", "0", "1"]);
  });
  it("Innerhalb Entwurf alphabetisch (Länge → lex)", () => {
    const sorted = sortIndexLabels(["AA", "A", "B", "BA"]);
    expect(sorted).toEqual(["A", "B", "AA", "BA"]);
  });
  it("Innerhalb Freigegeben numerisch", () => {
    const sorted = sortIndexLabels(["10", "2", "1", "0"]);
    expect(sorted).toEqual(["0", "1", "2", "10"]);
  });
});

describe("plaene/isValidIndexLabel", () => {
  it("akzeptiert A-Z und 0-9", () => {
    expect(isValidIndexLabel("A")).toBe(true);
    expect(isValidIndexLabel("ZZ")).toBe(true);
    expect(isValidIndexLabel("0")).toBe(true);
    expect(isValidIndexLabel("123")).toBe(true);
  });
  it("lehnt leer und Sonderzeichen ab", () => {
    expect(isValidIndexLabel("")).toBe(false);
    expect(isValidIndexLabel(" ")).toBe(false);
    expect(isValidIndexLabel("A1")).toBe(false);
    expect(isValidIndexLabel("A-1")).toBe(false);
  });
  it("lehnt zu lange Labels ab", () => {
    expect(isValidIndexLabel("ABCDEFGHI")).toBe(false);
  });
});

describe("plaene/indexSortKey direkt", () => {
  it("liefert verschiedene tier-Werte", () => {
    const a = indexSortKey("A");
    const z = indexSortKey("0");
    expect(a[0]).toBe(0);
    expect(z[0]).toBe(1);
  });
});
