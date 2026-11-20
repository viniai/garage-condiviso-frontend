import { db, type GarageDB, type LocalDraft, type LocalExpense, type LocalVehicle, newId } from "./db";

export class LimitReachedError extends Error {
  constructor(readonly limit: number) {
    super(`Hai raggiunto il limite di ${limit} diari veicolo`);
  }
}

export type NewVehicle = Pick<LocalVehicle, "make" | "model" | "year" | "title"> &
  Partial<Pick<LocalVehicle, "plate" | "vin" | "budget">>;

export function createRepo(store: GarageDB = db) {
  return {
    listVehicles: () => store.vehicles.orderBy("createdAt").toArray(),

    async addVehicle(input: NewVehicle, limit: number): Promise<LocalVehicle> {
      if ((await store.vehicles.count()) >= limit) throw new LimitReachedError(limit);
      const vehicle: LocalVehicle = {
        id: newId(),
        plate: "",
        vin: "",
        budget: 0,
        ...input,
        createdAt: Date.now(),
      };
      await store.vehicles.add(vehicle);
      return vehicle;
    },

    updateVehicle: (id: string, changes: Partial<LocalVehicle>) => store.vehicles.update(id, changes),

    async removeVehicle(id: string) {
      await store.transaction("rw", store.vehicles, store.expenses, store.drafts, async () => {
        await store.expenses.where("vehicleId").equals(id).delete();
        await store.drafts.where("vehicleId").equals(id).delete();
        await store.vehicles.delete(id);
      });
    },

    listExpenses: (vehicleId: string) => store.expenses.where("vehicleId").equals(vehicleId).sortBy("date"),

    async addExpense(input: Omit<LocalExpense, "id">): Promise<LocalExpense> {
      if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Importo non valido");
      const expense = { ...input, id: newId() };
      await store.expenses.add(expense);
      return expense;
    },

    removeExpense: (id: string) => store.expenses.delete(id),

    saveDraft: (draft: Omit<LocalDraft, "id" | "updatedAt"> & { id?: string }) =>
      store.drafts.put({ ...draft, id: draft.id ?? newId(), updatedAt: Date.now() }),
    listDrafts: (vehicleId: string) => store.drafts.where("vehicleId").equals(vehicleId).toArray(),
    removeDraft: (id: string) => store.drafts.delete(id),
  };
}

export const repo = createRepo();
