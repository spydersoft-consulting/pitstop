import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import type { ReminderTemplate } from "../../store/slices/reminderSlice";

const templates: ReminderTemplate[] = [
  { serviceType: "OilChange", name: "Oil change", intervalMiles: 5000, intervalMonths: 6 },
  { serviceType: "BrakeFluid", name: "Brake fluid", intervalMonths: 24 },
  { serviceType: "SparkPlugs", name: "Spark plugs", intervalMiles: 60000 },
];

function renderDialog(list: ReminderTemplate[] = templates) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(<TemplatePickerDialog templates={list} onClose={onClose} onSubmit={onSubmit} />);
  return { onClose, onSubmit };
}

describe("TemplatePickerDialog", () => {
  it("describes each template's interval, whichever parts it has", () => {
    renderDialog();

    expect(screen.getByText("Every 5,000 mi or 6 mo")).toBeInTheDocument();
    expect(screen.getByText("Every 24 mo")).toBeInTheDocument();
    expect(screen.getByText("Every 60,000 mi")).toBeInTheDocument();
  });

  it("explains when every template is already in use", () => {
    renderDialog([]);

    expect(screen.getByText(/every common service already has a reminder/i)).toBeInTheDocument();
  });

  it("disables Add until something is selected", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });

  it("submits the selected service types and counts them on the button", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/oil change/i));
    await user.click(screen.getByLabelText(/brake fluid/i));
    await user.click(screen.getByRole("button", { name: /^add 2$/i }));

    expect(onSubmit).toHaveBeenCalledWith(["OilChange", "BrakeFluid"]);
  });

  it("deselects a template when it is toggled again", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/oil change/i));
    await user.click(screen.getByLabelText(/spark plugs/i));
    await user.click(screen.getByLabelText(/oil change/i));
    await user.click(screen.getByRole("button", { name: /^add 1$/i }));

    expect(onSubmit).toHaveBeenCalledWith(["SparkPlugs"]);
  });

  it("closes without submitting on Cancel", async () => {
    const { onClose, onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
