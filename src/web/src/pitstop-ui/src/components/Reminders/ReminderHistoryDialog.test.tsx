import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReminderHistoryDialog } from "./ReminderHistoryDialog";
import type { Reminder } from "../../store/slices/reminderSlice";

vi.mock("../../api/remindersApi", () => ({
  remindersApi: { history: vi.fn() },
}));

import { remindersApi } from "../../api/remindersApi";

const reminder: Reminder = { id: 7, vehicleId: 1, serviceType: "OilChange", name: "Oil change" };

function renderDialog() {
  return render(<ReminderHistoryDialog vehicleId={1} reminder={reminder} onClose={vi.fn()} />);
}

describe("ReminderHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the history for the reminder", async () => {
    vi.mocked(remindersApi.history).mockResolvedValue([]);
    renderDialog();

    await screen.findByText(/no matching services have been logged yet/i);
    expect(remindersApi.history).toHaveBeenCalledWith(1, 7);
  });

  it("flags late services, on-time services and the first recorded service", async () => {
    vi.mocked(remindersApi.history).mockResolvedValue([
      {
        maintenanceLogId: 3,
        serviceDate: "2026-07-22",
        odometer: 17340,
        dueDate: "2026-07-10",
        dueOdometer: 17000,
        daysLate: 12,
        milesOver: 340,
        wasLate: true,
      },
      {
        maintenanceLogId: 2,
        serviceDate: "2026-04-01",
        odometer: 15000,
        dueDate: "2026-07-10",
        dueOdometer: 17000,
        daysLate: 0,
        milesOver: 0,
        wasLate: false,
      },
      { maintenanceLogId: 1, serviceDate: "2026-01-10", odometer: 12000, wasLate: false },
    ]);
    renderDialog();

    expect(await screen.findByText("12 days late · 340 mi over")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText("First recorded service")).toBeInTheDocument();
  });

  it("uses the singular for a single day late", async () => {
    vi.mocked(remindersApi.history).mockResolvedValue([
      {
        maintenanceLogId: 2,
        serviceDate: "2026-07-11",
        odometer: 15000,
        dueDate: "2026-07-10",
        daysLate: 1,
        wasLate: true,
      },
    ]);
    renderDialog();

    expect(await screen.findByText("1 day late")).toBeInTheDocument();
  });

  it("shows an error when the history can't be loaded", async () => {
    vi.mocked(remindersApi.history).mockRejectedValue(new Error("boom"));
    renderDialog();

    expect(await screen.findByText(/couldn't load the history/i)).toBeInTheDocument();
  });
});
