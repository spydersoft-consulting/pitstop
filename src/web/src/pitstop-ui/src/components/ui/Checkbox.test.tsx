import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("is labelled by an external label via inputId and reports toggles", async () => {
    const onChange = vi.fn();
    render(
      <>
        <Checkbox inputId="agree" checked={false} onChange={onChange} />
        <label htmlFor="agree">Agree</label>
      </>,
    );
    const box = screen.getByLabelText("Agree");
    expect(box).toHaveAttribute("type", "checkbox");
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith({ checked: true });
  });

  it("reflects checked state and disabled", () => {
    render(<Checkbox inputId="x" checked disabled onChange={vi.fn()} />);
    const box = screen.getByRole("checkbox");
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });
});
