import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ConsentCheck } from "../components/ui";
import PrivacyPage from "../pages/PrivacyPage";
import TermsPage from "../pages/TermsPage";

describe("pagine legali e consenso", () => {
  it("l'informativa elenca i dati locali, Google e i diritti", () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(screen.getByText(/non vengono mai inviati ai nostri server/)).toBeTruthy();
    expect(screen.getByText("Accesso con Google")).toBeTruthy();
    expect(screen.getByText("I tuoi diritti")).toBeTruthy();
  });

  it("i termini rimandano all'informativa", () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "informativa privacy" }).getAttribute("href")).toBe("/privacy");
  });

  it("la casella di consenso notifica il cambio", () => {
    const onChange = vi.fn();
    render(<MemoryRouter><ConsentCheck checked={false} onChange={onChange} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
