import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardTitle } from "../src/components/ui/card";
import { Label } from "../src/components/ui/label";

describe("accessible UI primitives", () => {
  it("renders card titles as named headings", () => {
    render(<CardTitle>Account settings</CardTitle>);

    expect(screen.getByRole("heading", { name: "Account settings", level: 3 })).toBeInTheDocument();
  });

  it("associates labels with their controls", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
  });
});
