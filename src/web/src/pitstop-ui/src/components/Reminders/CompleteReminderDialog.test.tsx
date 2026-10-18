import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CompleteReminderDialog } from "./CompleteReminderDialog";
import type { Reminder } from "../../store/slices/reminderSlice";

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 1,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  estimatedOdometer: 44600.4,
  ...overrides,
});

function renderDialog(r: Reminder = reminder()) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(<CompleteReminderDialog reminder={r} onClose={onClose} onSubmit={onSubmit} />);
  return { onClose, onSubmit };
}

describe("CompleteReminderDialog", () => {
  it("shows the reminder name in the header", () => {
    renderDialog();

    expect(screen.getByText("Mark done: Oil change")).toBeInTheDocument();
  });

  it("falls back to a generic header when the reminder has no name", () => {
    renderDialog(reminder({ name: undefined }));

    expect(screen.getByText("Mark done: reminder")).toBeInTheDocument();
  });

  it("prefills today's date and the rounded estimated odometer", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^mark done$/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ odometer: 44600 }));
    expect(onSubmit.mock.calls[0][0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("starts the odometer at zero when there is no estimate", async () => {
    const { onSubmit } = renderDialog(reminder({ estimatedOdometer: undefined }));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^mark done$/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ odometer: 0 }));
  });

  it("submits the odometer the owner types", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    const odometer = screen.getByLabelText("Odometer (mi)");
    await user.clear(odometer);
    await user.type(odometer, "45000");
    await user.click(screen.getByRole("button", { name: /^mark done$/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ odometer: 45000 }));
  });

  it("disables Mark done when the odometer is cleared", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Odometer (mi)"));
    await user.tab();

    const button = screen.getByRole("button", { name: /^mark done$/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes without submitting on Cancel", async () => {
    const { onClose, onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
