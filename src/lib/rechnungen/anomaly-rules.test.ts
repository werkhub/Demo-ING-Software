import { describe, expect, it } from "vitest";
import {
  findMathErrors,
  findPositionsNotInContract,
  findPriceJumps,
} from "./anomaly-rules";
import { aggregateAnomalyScore } from "./anomaly-score";

type Pos = {
  positionIndex: number;
  lvPosition: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

function p(overrides: Partial<Pos>): Pos {
  return {
    positionIndex: 0,
    lvPosition: "01.10.10",
    quantity: 1,
    unitPrice: 100,
    totalPrice: 100,
    ...overrides,
  };
}

describe("findMathErrors", () => {
  it("erkennt einen Math-Fehler bei Abweichung > 0,01 €", () => {
    const findings = findMathErrors([
      p({ positionIndex: 0, quantity: 4, unitPrice: 95, totalPrice: 420 }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("math_error");
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].positionIndex).toBe(0);
    expect(findings[0].payload.expected).toBe(380);
    expect(findings[0].payload.actual).toBe(420);
  });

  it("akzeptiert Cent-Toleranz von genau 0,01 €", () => {
    const findings = findMathErrors([
      p({ quantity: 3, unitPrice: 33.33, totalPrice: 99.99 }), // 99.99 vs 99.99 → ok
      p({ positionIndex: 1, quantity: 3, unitPrice: 33.33, totalPrice: 100.0 }), // 0.01 € off
    ]);
    expect(findings).toHaveLength(0); // beide innerhalb Toleranz
  });

  it("erkennt mehrere Math-Fehler unabhängig", () => {
    const findings = findMathErrors([
      p({ positionIndex: 0, quantity: 10, unitPrice: 5, totalPrice: 60 }),
      p({ positionIndex: 1, quantity: 10, unitPrice: 5, totalPrice: 50 }),
      p({ positionIndex: 2, quantity: 7, unitPrice: 100, totalPrice: 750 }),
    ]);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.positionIndex)).toEqual([0, 2]);
  });

  it("liefert leeres Array bei korrekten Positionen", () => {
    const findings = findMathErrors([
      p({ positionIndex: 0, quantity: 460, unitPrice: 47, totalPrice: 21620 }),
      p({ positionIndex: 1, quantity: 280, unitPrice: 9.07, totalPrice: 2539.6 }),
    ]);
    expect(findings).toEqual([]);
  });
});

describe("findPriceJumps", () => {
  it("erkennt einen Preis-Sprung > 15 % als warning", () => {
    const findings = findPriceJumps(
      [p({ positionIndex: 0, lvPosition: "12.10.20", unitPrice: 47 })],
      [
        { lvPosition: "12.10.20", unitPrice: 38 },
        { lvPosition: "12.10.20", unitPrice: 38 },
      ]
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("price_jump");
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].payload.deltaPercent).toBe(24);
  });

  it("klassifiziert einen Sprung > 40 % als critical", () => {
    const findings = findPriceJumps(
      [p({ positionIndex: 0, lvPosition: "08.40.10", unitPrice: 100 })],
      [{ lvPosition: "08.40.10", unitPrice: 50 }]
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("critical");
  });

  it("ignoriert Preis-Senkungen", () => {
    const findings = findPriceJumps(
      [p({ positionIndex: 0, lvPosition: "12.10.20", unitPrice: 30 })],
      [{ lvPosition: "12.10.20", unitPrice: 38 }]
    );
    expect(findings).toEqual([]);
  });

  it("ignoriert Positionen ohne lvPosition oder Vorrechnungs-Historie", () => {
    const findings = findPriceJumps(
      [
        p({ positionIndex: 0, lvPosition: null, unitPrice: 1000 }),
        p({ positionIndex: 1, lvPosition: "neu.99", unitPrice: 1000 }),
      ],
      [{ lvPosition: "12.10.20", unitPrice: 38 }]
    );
    expect(findings).toEqual([]);
  });

  it("nutzt den Mittelwert über mehrere Vorrechnungen", () => {
    const findings = findPriceJumps(
      [p({ positionIndex: 0, lvPosition: "01", unitPrice: 60 })],
      [
        { lvPosition: "01", unitPrice: 40 },
        { lvPosition: "01", unitPrice: 50 },
        { lvPosition: "01", unitPrice: 60 },
        // Mittel = 50
      ]
    );
    // 60/50 - 1 = 20 % → warning
    expect(findings).toHaveLength(1);
    expect(findings[0].payload.avgPrevious).toBe(50);
    expect(findings[0].payload.deltaPercent).toBe(20);
  });

  it("ignoriert Vorrechnungs-Positionen mit unitPrice <= 0", () => {
    const findings = findPriceJumps(
      [p({ positionIndex: 0, lvPosition: "01", unitPrice: 100 })],
      [
        { lvPosition: "01", unitPrice: 0 }, // ignoriert
        { lvPosition: "01", unitPrice: -5 }, // ignoriert
      ]
    );
    expect(findings).toEqual([]);
  });
});

describe("findPositionsNotInContract", () => {
  it("erkennt fehlende LV-Positionen im Hauptvertrag", () => {
    const findings = findPositionsNotInContract(
      [
        p({ positionIndex: 0, lvPosition: "01.10.10" }),
        p({ positionIndex: 1, lvPosition: "99.99.99" }),
      ],
      "Hauptvertrag · LV: 01.10.10 Erdarbeiten"
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("not_in_contract");
    expect(findings[0].positionIndex).toBe(1);
  });

  it("liefert leeres Array bei null-Vertragstext", () => {
    const findings = findPositionsNotInContract(
      [p({ positionIndex: 0, lvPosition: "99.99.99" })],
      null
    );
    expect(findings).toEqual([]);
  });

  it("ignoriert Positionen ohne lvPosition", () => {
    const findings = findPositionsNotInContract(
      [p({ positionIndex: 0, lvPosition: null })],
      "Vertrag ohne diese Position"
    );
    expect(findings).toEqual([]);
  });

  it("ist case-insensitive", () => {
    const findings = findPositionsNotInContract(
      [p({ positionIndex: 0, lvPosition: "01.10.10" })],
      "VERTRAG · 01.10.10 Erdarbeiten"
    );
    expect(findings).toEqual([]);
  });
});

describe("aggregateAnomalyScore", () => {
  it("liefert 0 bei keinen Findings", () => {
    expect(aggregateAnomalyScore([])).toBe(0);
  });

  it("addiert Severity-Gewichte", () => {
    const score = aggregateAnomalyScore([
      {
        kind: "math_error",
        severity: "critical",
        description: "x",
        payload: {},
        positionIndex: 0,
      },
      {
        kind: "price_jump",
        severity: "warning",
        description: "x",
        payload: {},
        positionIndex: 0,
      },
      {
        kind: "format_warning",
        severity: "info",
        description: "x",
        payload: {},
        positionIndex: 0,
      },
    ]);
    // 30 + 12 + 4 = 46
    expect(score).toBe(46);
  });

  it("deckelt auf 100", () => {
    const findings = Array.from({ length: 10 }, () => ({
      kind: "math_error" as const,
      severity: "critical" as const,
      description: "x",
      payload: {},
      positionIndex: 0,
    }));
    expect(aggregateAnomalyScore(findings)).toBe(100);
  });
});
