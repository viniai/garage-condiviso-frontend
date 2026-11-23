import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/endpoints";
import { SessionProvider } from "../auth/session";
import ReportMenu from "../components/ReportMenu";

function mount() {
  return render(
    <SessionProvider>
      <MemoryRouter>
        <ReportMenu targetType="part" targetId="p1" label="questo annuncio" />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("ReportMenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("i tre puntini aprono il menu con Segnala", () => {
    mount();
    expect(screen.queryByText("Segnala")).toBeNull();
    fireEvent.click(screen.getByLabelText("Altre azioni"));
    expect(screen.getByRole("menuitem", { name: "Segnala" })).toBeTruthy();
  });

  it("senza accesso chiede di accedere", () => {
    mount();
    fireEvent.click(screen.getByLabelText("Altre azioni"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Segnala" }));
    expect(screen.getByText("Per inviare una segnalazione devi accedere.")).toBeTruthy();
  });

  it("con accesso invia la segnalazione col motivo scelto", async () => {
    localStorage.setItem("gc.token", "t");
    vi.spyOn(api, "me").mockResolvedValue({ id: "u", email: "a@b.it", is_admin: false, profile: null } as never);
    const report = vi.spyOn(api, "report").mockResolvedValue({} as never);
    mount();
    fireEvent.click(screen.getByLabelText("Altre azioni"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Segnala" }));
    fireEvent.change(await screen.findByLabelText("Motivo"), { target: { value: "fake" } });
    fireEvent.click(screen.getByText("Invia segnalazione"));
    await waitFor(() => expect(report).toHaveBeenCalledWith("t", { target_type: "part", target_id: "p1", reason: "fake", details: "" }));
    expect(await screen.findByText(/abbiamo ricevuto la segnalazione/)).toBeTruthy();
  });
});

describe("ReportMenu sui propri contenuti", () => {
  it("mostra Modifica ed Elimina al posto di Segnala", () => {
    const onDelete = vi.fn();
    render(
      <SessionProvider>
        <MemoryRouter>
          <ReportMenu
            targetType="part"
            targetId="p1"
            ownerActions={[{ label: "Modifica", to: "/da-parte?modifica=p1" }, { label: "Elimina", danger: true, onClick: onDelete }]}
          />
        </MemoryRouter>
      </SessionProvider>,
    );
    fireEvent.click(screen.getByLabelText("Altre azioni"));
    expect(screen.queryByRole("menuitem", { name: "Segnala" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Modifica" }).getAttribute("href")).toBe("/da-parte?modifica=p1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Elimina" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
