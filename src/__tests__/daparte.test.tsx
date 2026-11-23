import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/endpoints";
import { SessionProvider } from "../auth/session";
import DaPartePage from "../pages/DaPartePage";

const part = {
  id: "p1", title: "Faro anteriore", category: "light", make: "Fiat", model: "500", description: "Originale",
  price_cents: 8550, is_visible: true, lat: 45, lon: 9, photos: [], seller: { id: "s1", handle: "io", display_name: "Io", status: "active" },
};

function mount(path = "/da-parte") {
  localStorage.setItem("gc.token", "t");
  vi.spyOn(api, "me").mockResolvedValue({ id: "u", email: "a@b.it", is_admin: false, profile: { id: "s1", handle: "io" } } as never);
  vi.spyOn(api, "myParts").mockResolvedValue([part] as never);
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <DaPartePage />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("Da parte: modifica", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("dal menu ⋯ apre il modulo precompilato e salva le modifiche", async () => {
    const update = vi.spyOn(api, "updatePart").mockResolvedValue(part as never);
    mount();
    fireEvent.click(await screen.findByLabelText("Altre azioni"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Modifica" }));
    const title = (await screen.findByLabelText("Pezzo")) as HTMLInputElement;
    expect(title.value).toBe("Faro anteriore");
    expect((screen.getByLabelText("Prezzo (€)") as HTMLInputElement).value).toBe("85,50");
    fireEvent.change(title, { target: { value: "Faro destro" } });
    fireEvent.change(screen.getByLabelText("Prezzo (€)"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Salva modifiche"));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update.mock.calls[0]?.[1]).toBe("p1");
    expect(update.mock.calls[0]?.[2]).toMatchObject({ title: "Faro destro", price_cents: null, make: "Fiat", is_visible: true });
  });

  it("?modifica=<id> apre direttamente la modifica", async () => {
    mount("/da-parte?modifica=p1");
    expect(await screen.findByText("Salva modifiche")).toBeTruthy();
  });

  it("l'eliminazione chiede conferma", async () => {
    const del = vi.spyOn(api, "deletePart").mockResolvedValue(undefined as never);
    mount();
    fireEvent.click(await screen.findByLabelText("Altre azioni"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Elimina" }));
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Conferma eliminazione"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("t", "p1"));
  });
});
