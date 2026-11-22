/** Dati del titolare: si impostano con variabili del build (VITE_LEGAL_*) e compaiono nelle pagine legali. */
const TODO = "[da completare]";

export const LEGAL = {
  owner: import.meta.env.VITE_LEGAL_OWNER || TODO,
  address: import.meta.env.VITE_LEGAL_ADDRESS || TODO,
  email: import.meta.env.VITE_LEGAL_EMAIL || TODO,
  updated: "22 novembre 2026",
};
