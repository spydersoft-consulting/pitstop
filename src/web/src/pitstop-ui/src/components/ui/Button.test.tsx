import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders children when no label is given", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("applies variant, severity and size classes", () => {
    render(<Button label="Delete" variant="text" severity="danger" size="sm" className="mt-2" />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveClass("text-danger", "min-h-9", "mt-2");
  });

  it("disables the button and ignores clicks while loading", async () => {
    const onClick = vi.fn();
    render(<Button label="Saving" loading onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disables the button when disabled", () => {
    render(<Button label="Nope" disabled />);
    expect(screen.getByRole("button", { name: "Nope" })).toBeDisabled();
  });

  it("places the icon on the requested side", () => {
    render(<Button label="Next" icon={<span data-testid="icon" />} iconPos="right" />);
    const button = screen.getByRole("button", { name: "Next" });
    expect(button.lastElementChild).toBe(screen.getByTestId("icon"));
  });

  it("defaults to type=button", () => {
    render(<Button label="Plain" />);
    expect(screen.getByRole("button", { name: "Plain" })).toHaveAttribute("type", "button");
  });

  it("forwards the ref to the button element", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button label="Ref" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
