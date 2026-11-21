import type { ForwardingItem } from "../api/types";
import { forwardingText } from "../lib/forwarding";

const item: ForwardingItem = {
  id: "1",
  created_at: "2026-11-21T10:00:00Z",
  message: "Il faro è ancora disponibile?",
  part_title: "Faro 124 Spider",
  forwarded_at: null,
  sender: { handle: "mario_500", display_name: "Mario Rossi", email: "mario@example.com" },
  seller: { id: "s", handle: "officina_bianchi", display_name: "Officina Bianchi", status: "unclaimed" },
};

describe("forwardingText", () => {
  it("include mittente, pezzo, messaggio ed email di risposta", () => {
    const text = forwardingText(item);
    expect(text).toContain("Officina Bianchi");
    expect(text).toContain('"Faro 124 Spider"');
    expect(text).toContain("Il faro è ancora disponibile?");
    expect(text).toContain("mario@example.com");
    expect(text).not.toContain("claim");
  });
  it("aggiunge il link di riscatto solo se presente", () => {
    expect(forwardingText(item, "https://x.it/claim?token=abc")).toContain("https://x.it/claim?token=abc");
  });
});
