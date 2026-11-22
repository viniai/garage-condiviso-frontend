import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Part } from "../api/types";
import { PartPhotoManager } from "../components/PartPhotos";

const photo = (n: number) => ({ id: `p${n}`, url: `/media/x${n}.webp`, width: 10, height: 10 });
const part = (n: number) => ({ id: "a", title: "Faro", photos: Array.from({ length: n }, (_, i) => photo(i)) }) as unknown as Part;

function mount(n: number) {
  return render(<MemoryRouter><PartPhotoManager part={part(n)} token="t" onChange={() => undefined} /></MemoryRouter>);
}

describe("PartPhotoManager", () => {
  it("con meno di 3 foto offre di aggiungerne", () => {
    mount(1);
    expect(screen.getByText("+ Foto")).toBeTruthy();
    expect(screen.getByText("1/3 foto")).toBeTruthy();
  });
  it("con 3 foto non offre più di aggiungerne", () => {
    mount(3);
    expect(screen.queryByText("+ Foto")).toBeNull();
    expect(screen.getAllByLabelText("Elimina foto")).toHaveLength(3);
  });
});
