import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title and subtitle", () => {
    render(<PageHeader title="Dashboard" subtitle="Welcome back" />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("omits subtitle when not provided", () => {
    render(<PageHeader title="Vehicles" />);
    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <PageHeader
        title="Fill-Ups"
        actions={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders without a title", () => {
    render(<PageHeader actions={<span data-testid="only-actions">actions</span>} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByTestId("only-actions")).toBeInTheDocument();
  });
});
