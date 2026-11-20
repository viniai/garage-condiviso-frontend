import type { LocalExpense } from "../local/db";

export interface PhaseTotal {
  phase: string;
  total: number;
}

export const NO_PHASE = "Altro";

export function totalsByPhase(expenses: LocalExpense[]): PhaseTotal[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const phase = e.phase.trim() || NO_PHASE;
    map.set(phase, (map.get(phase) ?? 0) + e.amount);
  }
  return [...map.entries()].map(([phase, total]) => ({ phase, total })).sort((a, b) => b.total - a.total);
}

export const sum = (expenses: LocalExpense[]): number => expenses.reduce((acc, e) => acc + e.amount, 0);

export const formatEuro = (value: number): string =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

/** Percentuale di budget usata, limitata a [0, 100]; 0 se non c'è budget. */
export function budgetUsedPct(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}
