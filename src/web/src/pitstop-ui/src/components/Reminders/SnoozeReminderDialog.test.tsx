import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SnoozeReminderDialog } from "./SnoozeReminderDialog";
import type { Reminder } from "../../store/slices/reminderSlice";

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 1,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  ...overrides,
});

function renderDialog(r: Reminder = reminder()) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(<SnoozeReminderDialog reminder={r} onClose={onClose} onSubmit={onSubmit} />);
  return { onClose, onSubmit };
}

const localDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("SnoozeReminderDialog", () => {
  it("shows the reminder name in the header, with a generic fallback", () => {
    renderDialog();
    expect(screen.getByText("Snooze: Oil change")).toBeInTheDocument();
  });

  it("falls back to a generic header when the reminder has no name", () => {
    renderDialog(reminder({ name: undefined }));
    expect(screen.getByText("Snooze: reminder")).toBeInTheDocument();
  });

  it("snoozes for 30 days by default", async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^snooze$/i }));

    const expected = new Date();
    expected.setDate(expected.getDate() + 30);
    expect(onSubmit).toHaveBeenCalledWith(localDateString(expected));
  });

  it("only offers to clear the snooze when the reminder is snoozed", () => {
    renderDialog();

    expect(screen.queryByRole("button", { name: /clear snooze/i })).not.toBeInTheDocument();
  });

  it("clears an existing snooze", async () => {
    const { onSubmit } = renderDialog(reminder({ snoozedUntil: "2026-12-01" }));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /clear snooze/i }));

    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  it("closes without submitting on Cancel", async () => {
    const { onClose, onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
