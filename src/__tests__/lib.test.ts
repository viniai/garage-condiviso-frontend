import { budgetUsedPct, formatEuro, sum, totalsByPhase } from "../lib/budget";
import { radiusFromBounds, roundCoord } from "../lib/geo";
import { fitWithin } from "../lib/image";
import type { LocalExpense } from "../local/db";

const exp = (phase: string, amount: number): LocalExpense => ({
  id: crypto.randomUUID(), vehicleId: "v", phase, amount, note: "", date: "2026-01-01",
});

describe("budget", () => {
  it("raggruppa per fase, ordina per importo e usa 'Altro' per le fasi vuote", () => {
    const totals = totalsByPhase([exp("Motore", 100), exp("", 50), exp("Motore", 200), exp("  ", 10)]);
    expect(totals).toEqual([
      { phase: "Motore", total: 300 },
      { phase: "Altro", total: 60 },
    ]);
  });
  it("somma e formatta in euro", () => {
    expect(sum([exp("a", 1.5), exp("b", 2.5)])).toBe(4);
    expect(formatEuro(12345)).toMatch(/12\.345/);
  });
  it("percentuale di budget limitata a 100 e sicura senza budget", () => {
    expect(budgetUsedPct(50, 200)).toBe(25);
    expect(budgetUsedPct(500, 200)).toBe(100);
    expect(budgetUsedPct(50, 0)).toBe(0);
  });
});

describe("image", () => {
  it("non ingrandisce le immagini piccole e mantiene le proporzioni", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 3000)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });
});

describe("geo", () => {
  it("generalizza le coordinate a 2 decimali", () => {
    expect(roundCoord(45.123456)).toBe(45.12);
    expect(roundCoord(9.987654)).toBe(9.99);
  });
  it("calcola un raggio limitato tra 1 e 500 km", () => {
    expect(radiusFromBounds(46, 45, 45.5, 10, 9)).toBeGreaterThan(40);
    expect(radiusFromBounds(60, 30, 45, 40, -10)).toBe(500);
    expect(radiusFromBounds(45.001, 45, 45, 9.001, 9)).toBe(1);
  });
});
