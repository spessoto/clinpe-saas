import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renderiza o titulo principal", async () => {
    const page = await Home();
    render(page);

    expect(
      screen.getByRole("heading", { name: /foque nos seus pacientes/i }),
    ).toBeInTheDocument();
  });
});
