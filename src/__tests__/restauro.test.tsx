import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider } from "../auth/session";
import { db } from "../local/db";
import { repo } from "../local/repo";
import RestauroPage from "../pages/RestauroPage";

beforeEach(async () => {
  await Promise.all([db.vehicles.clear(), db.expenses.clear(), db.drafts.clear()]);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ max_vehicles_per_user: 2, max_photos_per_vehicle: 30, reviews_on_unclaimed: false }), { status: 200 }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

const renderPage = () =>
  render(<SessionProvider><MemoryRouter><RestauroPage /></MemoryRouter></SessionProvider>);

describe("Restauro: limite di diari veicolo", () => {
  it("permette di creare un diario e blocca il pulsante dopo il secondo", async () => {
    const user = userEvent.setup();
    renderPage();
    const button = await screen.findByRole("button", { name: "Nuovo diario veicolo" });
    await waitFor(() => expect(button).toBeEnabled());

    await user.click(button);
    await user.type(screen.getByLabelText("Nome del diario"), "La mia 500");
    await user.type(screen.getByLabelText("Marca"), "Fiat");
    await user.type(screen.getByLabelText("Modello"), "500 L");
    await user.type(screen.getByLabelText("Anno"), "1971");
    await user.click(screen.getByRole("button", { name: "Crea" }));
    expect(await screen.findByText("La mia 500")).toBeInTheDocument();

    await repo.addVehicle({ title: "Seconda", make: "Lancia", model: "Fulvia", year: 1968 }, 2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuovo diario veicolo" })).toBeDisabled());
    expect(screen.getByText(/In beta puoi tenere 2 diari veicolo/)).toBeInTheDocument();
  });

  it("non mostra mai targa o telaio nell'elenco", async () => {
    await repo.addVehicle({ title: "Segreta", make: "Fiat", model: "124", year: 1972, plate: "ZZ999ZZ", vin: "VIN123" }, 2);
    renderPage();
    expect(await screen.findByText("Segreta")).toBeInTheDocument();
    expect(screen.queryByText(/ZZ999ZZ/)).not.toBeInTheDocument();
  });
});
