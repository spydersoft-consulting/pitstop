import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputText, Textarea } from "./TextField";

describe("InputText", () => {
  it("passes value changes through", async () => {
    const onChange = vi.fn();
    render(<InputText aria-label="Name" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("marks the field invalid", () => {
    render(<InputText aria-label="Name" invalid onChange={vi.fn()} value="" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger");
  });

  it("is not marked invalid by default", () => {
    render(<InputText aria-label="Name" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Textarea", () => {
  it("grows to its content when autoResize is set", () => {
    render(<Textarea aria-label="Notes" autoResize value="x" onChange={vi.fn()} />);
    const el = screen.getByLabelText("Notes");
    expect(el).toHaveClass("resize-none");
    expect(el.style.height).not.toBe("");
  });

  it("does not set an inline height without autoResize", () => {
    render(<Textarea aria-label="Notes" invalid value="x" onChange={vi.fn()} />);
    const el = screen.getByLabelText("Notes");
    expect(el.style.height).toBe("");
    expect(el).toHaveAttribute("aria-invalid", "true");
  });
});
