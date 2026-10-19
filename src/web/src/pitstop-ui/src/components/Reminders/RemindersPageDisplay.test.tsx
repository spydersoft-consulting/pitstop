import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { RemindersPage } from "./RemindersPage";
import { reminderSliceReducer, type Reminder } from "../../store/slices/reminderSlice";
import { vehicleSliceReducer } from "../../store/slices/vehicleSlice";

vi.mock("../../api/remindersApi", () => ({ remindersApi: {} }));

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 1,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  status: "Ok",
  lastServiceDate: "2026-01-15",
  lastServiceOdometer: 40000,
  estimatedOdometer: 41000,
  ...overrides,
});

function renderPage(reminders: Reminder[], selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: { reminders: reminderSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      reminders: { reminders, templates: [], loading: false },
      vehicles: { vehicles: [], selectedVehicleId, loading: false },
    },
  });
  render(
    <MemoryRouter>
      <Provider store={store}>
        <RemindersPage />
      </Provider>
    </MemoryRouter>,
  );
}

describe("RemindersPage reminder details", () => {
  it("describes a mileage-only interval and due odometer", () => {
    renderPage([reminder({ intervalMiles: 5000, nextDueOdometer: 45000 })]);

    expect(screen.getByText(/Every 5,000 mi$/)).toBeInTheDocument();
    expect(screen.getByText(`${(45000).toLocaleString()} mi`)).toBeInTheDocument();
  });

  it("describes a time-only interval and due date", () => {
    renderPage([reminder({ intervalMonths: 12, nextDueDate: "2026-12-01" })]);

    expect(screen.getByText(/Every 12 mo$/)).toBeInTheDocument();
    expect(screen.getByText(new Date("2026-12-01T00:00:00").toLocaleDateString())).toBeInTheDocument();
  });

  it("shows a dash when there is nothing due to show", () => {
    renderPage([reminder({ intervalMonths: 12 })]);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the projected due date when one is available", () => {
    renderPage([reminder({ intervalMiles: 5000, nextDueOdometer: 45000, projectedDueDate: "2026-09-01" })]);

    expect(screen.getByText(/at current pace/)).toBeInTheDocument();
  });

  it("omits the projected date and the estimate marker when they don't apply", () => {
    renderPage([reminder({ intervalMiles: 5000, nextDueOdometer: 45000, isOdometerEstimated: false })]);

    expect(screen.queryByText(/at current pace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(est\.\)/)).not.toBeInTheDocument();
  });

  it("marks an estimated odometer", () => {
    renderPage([reminder({ intervalMiles: 5000, isOdometerEstimated: true })]);

    expect(screen.getByText(/\(est\.\)/)).toBeInTheDocument();
  });

  it("labels each status", () => {
    renderPage([
      reminder({ id: 1, name: "A", intervalMiles: 1, status: "Ok" }),
      reminder({ id: 2, name: "B", intervalMiles: 1, status: "DueSoon" }),
      reminder({ id: 3, name: "C", intervalMiles: 1, status: "Overdue" }),
      reminder({ id: 4, name: "D", intervalMiles: 1, status: "Snoozed", snoozedUntil: "2026-08-01" }),
    ]);

    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Snoozed")).toBeInTheDocument();
  });

  it("falls back gracefully for an unrecognised or missing status", () => {
    renderPage([
      reminder({ id: 1, name: "A", intervalMiles: 1, status: "Mystery" }),
      reminder({ id: 2, name: "B", intervalMiles: 1, status: undefined }),
    ]);

    expect(screen.getByText("Mystery")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("handles reminders without a name", () => {
    renderPage([reminder({ name: undefined, intervalMiles: 5000 })]);

    expect(screen.getByRole("button", { name: "Delete reminder" })).toBeInTheDocument();
  });
});
