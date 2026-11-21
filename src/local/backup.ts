/**
 * Backup/ripristino dei dati privati. Poiché risiedono solo nel browser, l'utente deve poter
 * esportarli: cancellare i dati del sito o cambiare dispositivo altrimenti li perderebbe.
 * Le foto delle bozze non sono incluse (si ripubblicano dal dispositivo).
 */
import type { GarageDB, LocalExpense, LocalVehicle } from "./db";

// L'identificativo "garage-condiviso" è il vecchio nome del progetto: resta invariato per
// non invalidare i backup già esportati (e il nome del database locale nel browser).
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "garage-condiviso";
  version: number;
  exportedAt: string;
  vehicles: LocalVehicle[];
  expenses: LocalExpense[];
}

export async function exportBackup(store: GarageDB): Promise<BackupFile> {
  return {
    app: "garage-condiviso",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    vehicles: await store.vehicles.toArray(),
    expenses: await store.expenses.toArray(),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export class InvalidBackupError extends Error {}

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new InvalidBackupError("Il file non è un JSON valido");
  }
  if (!isRecord(raw) || raw.app !== "garage-condiviso") throw new InvalidBackupError("File non riconosciuto");
  if (raw.version !== BACKUP_VERSION) throw new InvalidBackupError("Versione di backup non supportata");
  if (!Array.isArray(raw.vehicles) || !Array.isArray(raw.expenses)) throw new InvalidBackupError("Backup incompleto");

  const vehicles = raw.vehicles.map((v): LocalVehicle => {
    if (!isRecord(v) || !isStr(v.id) || !isStr(v.make) || !isStr(v.model) || !isNum(v.year) || !isStr(v.title))
      throw new InvalidBackupError("Veicolo non valido nel backup");
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      title: v.title,
      plate: isStr(v.plate) ? v.plate : "",
      vin: isStr(v.vin) ? v.vin : "",
      budget: isNum(v.budget) ? v.budget : 0,
      remoteId: isStr(v.remoteId) ? v.remoteId : undefined,
      createdAt: isNum(v.createdAt) ? v.createdAt : Date.now(),
    };
  });
  const expenses = raw.expenses.map((e): LocalExpense => {
    if (!isRecord(e) || !isStr(e.id) || !isStr(e.vehicleId) || !isNum(e.amount) || !isStr(e.date))
      throw new InvalidBackupError("Spesa non valida nel backup");
    return {
      id: e.id,
      vehicleId: e.vehicleId,
      phase: isStr(e.phase) ? e.phase : "",
      amount: e.amount,
      note: isStr(e.note) ? e.note : "",
      date: e.date,
    };
  });
  return {
    app: "garage-condiviso",
    version: BACKUP_VERSION,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : "",
    vehicles,
    expenses,
  };
}

/** Sostituisce i dati locali con quelli del backup, in una transazione. */
export async function restoreBackup(store: GarageDB, backup: BackupFile): Promise<void> {
  await store.transaction("rw", store.vehicles, store.expenses, store.drafts, async () => {
    await Promise.all([store.vehicles.clear(), store.expenses.clear(), store.drafts.clear()]);
    await store.vehicles.bulkAdd(backup.vehicles);
    await store.expenses.bulkAdd(backup.expenses);
  });
}
