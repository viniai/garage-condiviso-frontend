/**
 * Archivio PRIVATO nel browser (IndexedDB via Dexie).
 * Nulla di ciò che sta qui viene inviato al server: targhe, telaio, spese e bozze.
 */
import Dexie, { type EntityTable } from "dexie";

export interface LocalVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  plate: string;
  vin: string;
  budget: number;
  /** id del diario pubblico sul server, se già pubblicato */
  remoteId?: string;
  createdAt: number;
}

export interface LocalExpense {
  id: string;
  vehicleId: string;
  phase: string;
  amount: number;
  note: string;
  date: string;
}

export interface LocalDraft {
  id: string;
  vehicleId: string;
  title: string;
  body: string;
  phase: string;
  occurredOn: string;
  showInFeed: boolean;
  photos: Blob[];
  updatedAt: number;
}

export class GarageDB extends Dexie {
  vehicles!: EntityTable<LocalVehicle, "id">;
  expenses!: EntityTable<LocalExpense, "id">;
  drafts!: EntityTable<LocalDraft, "id">;

  constructor(name = "garage-condiviso") {
    super(name);
    this.version(1).stores({
      vehicles: "id, createdAt",
      expenses: "id, vehicleId, date",
      drafts: "id, vehicleId, updatedAt",
    });
  }
}

export const db = new GarageDB();
export const newId = (): string => crypto.randomUUID();
