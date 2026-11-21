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
