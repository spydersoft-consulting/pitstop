import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Select } from "./Select";
import { NumberField } from "./NumberField";
import { selectOption } from "../../test-utils/selectOption";

const options = [
  { label: "Self", value: "Self" },
  { label: "Shop", value: "Shop" },
];

describe("Select", () => {
  it("shows the placeholder when nothing is selected", () => {
    render(<Select value={null} options={options} onChange={vi.fn()} placeholder="Pick one" inputId="s" />);
    expect(screen.getByRole("button", { name: /Pick one/ })).toBeInTheDocument();
  });

  it("shows the selected label and reports a new choice", async () => {
    const onChange = vi.fn();
    render(<Select value="Self" options={options} onChange={onChange} inputId="s" />);
    const trigger = screen.getByRole("button", { name: /Self/ });
    await selectOption(userEvent.setup(), trigger, "Shop");
    expect(onChange).toHaveBeenCalledWith({ value: "Shop" });
  });

  it("supports numeric values", async () => {
    const onChange = vi.fn();
    render(
      <Select
        value={2}
        options={[
          { label: "One", value: 1 },
          { label: "Two", value: 2 },
        ]}
        onChange={onChange}
      />,
    );
    await selectOption(userEvent.setup(), screen.getByRole("button", { name: /Two/ }), "One");
    expect(onChange).toHaveBeenCalledWith({ value: 1 });
  });

  it("offers a clear button only when onClear is given and a value is set", async () => {
    const onClear = vi.fn();
    const { rerender } = render(<Select value="Self" options={options} onChange={vi.fn()} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);

    rerender(<Select value={null} options={options} onChange={vi.fn()} onClear={onClear} placeholder="None" />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    rerender(<Select value="Self" options={options} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("marks the trigger invalid with a danger border", () => {
    render(<Select value="Self" options={options} onChange={vi.fn()} invalid />);
    expect(screen.getByRole("button", { name: /Self/ })).toHaveClass("border-danger");
  });

  it("does not open when disabled", () => {
    render(<Select value="Self" options={options} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /Self/ })).toBeDisabled();
  });
});

describe("NumberField", () => {
  it("reports typed numbers on blur", async () => {
    const onValueChange = vi.fn();
    render(<NumberField value={null} onValueChange={onValueChange} aria-label="Miles" />);
    const input = screen.getByRole("textbox", { name: "Miles" });
    await userEvent.type(input, "1234");
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith({ value: 1234 });
  });

  it("reports null when cleared", async () => {
    const onValueChange = vi.fn();
    render(<NumberField value={5} onValueChange={onValueChange} aria-label="Miles" />);
    const input = screen.getByRole("textbox", { name: "Miles" });
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith({ value: null });
  });

  it("formats currency with the requested fraction digits", () => {
    render(
      <NumberField
        value={3.5}
        onValueChange={vi.fn()}
        mode="currency"
        minFractionDigits={3}
        maxFractionDigits={3}
        aria-label="Price"
      />,
    );
    expect(screen.getByRole("textbox", { name: "Price" })).toHaveValue("$3.500");
  });

  it("uses the placeholder as the accessible name without an inputId and links an id otherwise", () => {
    const { rerender } = render(<NumberField value={null} onValueChange={vi.fn()} placeholder="e.g. 10" />);
    expect(screen.getByRole("textbox", { name: "e.g. 10" })).toHaveAttribute("placeholder", "e.g. 10");
    rerender(
      <>
        <label id="odo-label" htmlFor="odo">
          Odometer
        </label>
        <NumberField value={null} onValueChange={vi.fn()} inputId="odo" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Odometer" })).toHaveAttribute("id", "odo");
  });

  it("calls onBlur and flags invalid input", async () => {
    const onBlur = vi.fn();
    render(<NumberField value={1} onValueChange={vi.fn()} onBlur={onBlur} invalid aria-label="N" />);
    const input = screen.getByRole("textbox", { name: "N" });
    await userEvent.click(input);
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger");
  });
});
