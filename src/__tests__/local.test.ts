import { exportBackup, InvalidBackupError, parseBackup, restoreBackup } from "../local/backup";
import { GarageDB } from "../local/db";
import { createRepo, LimitReachedError } from "../local/repo";

let store: GarageDB;
let repo: ReturnType<typeof createRepo>;

beforeEach(async () => {
  store = new GarageDB(`test-${crypto.randomUUID()}`);
  repo = createRepo(store);
});

const car = (title: string) => ({ title, make: "Fiat", model: "500", year: 1970 });

describe("archivio locale", () => {
  it("blocca il terzo veicolo con il limite configurato", async () => {
    await repo.addVehicle(car("Prima"), 2);
    await repo.addVehicle(car("Seconda"), 2);
    await expect(repo.addVehicle(car("Terza"), 2)).rejects.toBeInstanceOf(LimitReachedError);
    expect(await store.vehicles.count()).toBe(2);
  });

  it("rifiuta importi non validi e cancella spese e bozze con il veicolo", async () => {
    const v = await repo.addVehicle(car("Prima"), 2);
    const base = { vehicleId: v.id, phase: "Motore", note: "", date: "2026-01-01" };
    await expect(repo.addExpense({ ...base, amount: 0 })).rejects.toThrow();
    await expect(repo.addExpense({ ...base, amount: Number.NaN })).rejects.toThrow();
    await repo.addExpense({ ...base, amount: 120 });
    await repo.saveDraft({ vehicleId: v.id, title: "x", body: "", phase: "", occurredOn: "2026-01-01", showInFeed: true, photos: [] });

    await repo.removeVehicle(v.id);
    expect(await store.expenses.count()).toBe(0);
    expect(await store.drafts.count()).toBe(0);
  });
});

describe("backup", () => {
  it("esporta e ripristina veicoli e spese (round trip)", async () => {
    const v = await repo.addVehicle({ ...car("Prima"), plate: "AB123CD", budget: 5000 }, 2);
    await repo.addExpense({ vehicleId: v.id, phase: "Motore", amount: 300, note: "pistoni", date: "2026-02-01" });

    const backup = parseBackup(JSON.stringify(await exportBackup(store)));

    const other = new GarageDB(`test-${crypto.randomUUID()}`);
    await restoreBackup(other, backup);
    expect((await other.vehicles.toArray())[0]).toMatchObject({ title: "Prima", plate: "AB123CD", budget: 5000 });
    expect((await other.expenses.toArray())[0]).toMatchObject({ amount: 300, note: "pistoni" });
  });

  it.each([
    ["non JSON", "{{"],
    ["file estraneo", JSON.stringify({ app: "altro" })],
    ["versione sconosciuta", JSON.stringify({ app: "garage-condiviso", version: 99, vehicles: [], expenses: [] })],
    ["veicolo malformato", JSON.stringify({ app: "garage-condiviso", version: 1, vehicles: [{ id: 1 }], expenses: [] })],
    ["spesa malformata", JSON.stringify({ app: "garage-condiviso", version: 1, vehicles: [], expenses: [{ id: "x" }] })],
  ])("rifiuta un backup non valido: %s", (_name, text) => {
    expect(() => parseBackup(text)).toThrow(InvalidBackupError);
  });
});
