/** Prezzi degli annunci: in centesimi nell'API, "Su richiesta" se assenti. */

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "Su richiesta";
  const euros = cents / 100;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
  }).format(euros);
}

/** "120", "120,50" o "120.5" → centesimi; vuoto → null; non valido → undefined. */
export function parsePrice(input: string): number | null | undefined {
  const text = input.trim().replace(/\s|€/g, "");
  if (text === "") return null;
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(text)) return undefined;
  return Math.round(Number(text.replace(",", ".")) * 100);
}
