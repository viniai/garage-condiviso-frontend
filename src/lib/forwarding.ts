import type { ForwardingItem } from "../api/types";

/** Testo pronto da incollare in WhatsApp/email per inoltrare un messaggio al venditore. */
export function forwardingText(item: ForwardingItem, claimUrl?: string): string {
  const lines = [
    `Ciao ${item.seller.display_name}, ${item.sender.display_name} (@${item.sender.handle}) ti scrive su Vicini di Box per "${item.part_title}":`,
    "",
    item.message,
    "",
    `Puoi rispondergli all'indirizzo ${item.sender.email}.`,
  ];
  if (claimUrl) lines.push("", `Per gestire il tuo profilo e ricevere i messaggi direttamente: ${claimUrl}`);
  return lines.join("\n");
}
