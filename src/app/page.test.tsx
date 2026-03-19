import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renderiza o titulo principal", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /pododesk saas de podologia/i }),
    ).toBeInTheDocument();
  });
});
