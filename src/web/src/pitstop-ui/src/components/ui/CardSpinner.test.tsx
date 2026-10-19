import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";
import { Spinner } from "./Spinner";

describe("Card", () => {
  it("renders the title, children and extra classes", () => {
    const { container } = render(
      <Card title="Trend" className="lg:col-span-2">
        body
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Trend" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("lg:col-span-2");
  });

  it("omits the heading without a title", () => {
    render(<Card>only</Card>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("exposes an indeterminate progressbar with the requested size", () => {
    const { container } = render(<Spinner size={32} />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("width", "32");
  });

  it("defaults to 50px", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "50");
  });
});
