import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Highlight } from "../api/types";
import StoryViewer from "../components/StoryViewer";

const highlight: Highlight = {
  id: "h",
  title: "Restauro 500",
  cover_url: "/media/a.webp",
  items: [
    { id: "1", url: "/media/a.webp", width: 10, height: 10, caption: "Prima" },
    { id: "2", url: "/media/b.webp", width: 10, height: 10, caption: "Dopo" },
  ],
};

describe("StoryViewer", () => {
  it("naviga tra le foto e chiude dopo l'ultima", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StoryViewer highlight={highlight} onClose={onClose} />);
    expect(screen.getByText("Prima")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Foto successiva" }));
    expect(screen.getByText("Dopo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Foto precedente" }));
    expect(screen.getByText("Prima")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Foto successiva" }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Foto successiva" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("si chiude con Esc e mostra l'eliminazione solo al proprietario", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();
    const { rerender } = render(<StoryViewer highlight={highlight} onClose={onClose} />);
    expect(screen.queryByRole("button", { name: "Elimina foto" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();

    rerender(<StoryViewer highlight={highlight} onClose={onClose} onDeleteItem={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Elimina foto" }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("gestisce una raccolta vuota senza errori", () => {
    render(<StoryViewer highlight={{ ...highlight, items: [], cover_url: null }} onClose={() => {}} />);
    expect(screen.getByText("Questa raccolta è vuota.")).toBeInTheDocument();
  });
});
