import { describe, expect, it } from "vitest";
import { formatPrice, parsePrice } from "../lib/money";

describe("prezzi", () => {
  it("formatta in euro o 'Su richiesta'", () => {
    expect(formatPrice(null)).toBe("Su richiesta");
    expect(formatPrice(12000).replace(/\s/g, " ")).toBe("120 €");
    expect(formatPrice(8550).replace(/\s/g, " ")).toBe("85,50 €");
  });
  it("legge importi in euro", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("120")).toBe(12000);
    expect(parsePrice("85,50 €")).toBe(8550);
    expect(parsePrice("85.5")).toBe(8550);
    expect(parsePrice("abc")).toBeUndefined();
    expect(parsePrice("-5")).toBeUndefined();
  });
});

import { priceToInput } from "../lib/money";

describe("priceToInput", () => {
  it("riporta i centesimi nel campo di modifica", () => {
    expect(priceToInput(12000)).toBe("120");
    expect(priceToInput(8550)).toBe("85,50");
    expect(priceToInput(null)).toBe("");
    expect(priceToInput(undefined)).toBe("");
  });
});
