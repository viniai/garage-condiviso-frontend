import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/endpoints";
import { SessionProvider } from "../auth/session";
import LoginPage from "../pages/LoginPage";

function mount() {
  return render(
    <SessionProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.head.querySelectorAll("script").forEach((s) => s.remove());
  });

  it("senza client id non mostra Google né carica lo script", async () => {
    vi.spyOn(api, "config").mockResolvedValue({ google_client_id: null } as never);
    mount();
    await waitFor(() => expect(api.config).toHaveBeenCalled());
    expect(screen.queryByLabelText("Continua con Google")).toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it("con client id mostra il pulsante e carica lo script di Google", async () => {
    vi.spyOn(api, "config").mockResolvedValue({ google_client_id: "cid" } as never);
    mount();
    expect(await screen.findByLabelText("Continua con Google")).toBeTruthy();
    await waitFor(() => expect(document.querySelector('script[src*="accounts.google.com"]')).not.toBeNull());
  });
});
