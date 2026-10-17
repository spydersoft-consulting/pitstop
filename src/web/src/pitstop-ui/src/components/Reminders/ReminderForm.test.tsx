import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AddReminder } from "./AddReminder";
import { EditReminder } from "./EditReminder";
import { reminderSliceReducer, type Reminder, type ReminderTemplate } from "../../store/slices/reminderSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";

vi.mock("../../api/remindersApi", () => ({
  remindersApi: {
    list: vi.fn(),
    templates: vi.fn(),
    create: vi.fn(),
    createFromTemplates: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    snooze: vi.fn(),
  },
}));

import { remindersApi } from "../../api/remindersApi";

const sampleVehicle: Vehicle = {
  id: 1,
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  tankCapacityGallons: 14,
  initialOdometer: 0,
};

const existing: Reminder = {
  id: 7,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  intervalMiles: 5000,
  intervalMonths: 6,
  leadMiles: 500,
  leadDays: 14,
  isActive: true,
  status: "Ok",
};

const templates: ReminderTemplate[] = [
  {
    serviceType: "OilChange",
    name: "Oil change",
    intervalMiles: 5000,
    intervalMonths: 6,
    leadMiles: 500,
    leadDays: 14,
  },
  { serviceType: "BrakeFluid", name: "Brake fluid", intervalMonths: 24, leadDays: 30 },
];

function renderRoute(path: string, initialEntry: string, reminders: Reminder[] = []) {
  const store = configureStore({
    reducer: { reminders: reminderSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      reminders: { reminders, templates, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId: 1, loading: false },
    },
  });
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Provider store={store}>
        <Routes>
          <Route path="/reminders" element={<p>Reminders list</p>} />
          <Route path="/reminders/new" element={<AddReminder />} />
          <Route path="/reminders/:id/edit" element={<EditReminder />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
  return { store, path };
}

describe("AddReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least one interval", async () => {
    renderRoute("/reminders/new", "/reminders/new");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /add reminder/i }));

    expect(await screen.findByText(/set an interval in miles, months, or both/i)).toBeInTheDocument();
    expect(remindersApi.create).not.toHaveBeenCalled();
  });

  it("submits the entered values and returns to the list", async () => {
    vi.mocked(remindersApi.create).mockResolvedValue({ ...existing, id: 8 });
    const { store } = renderRoute("/reminders/new", "/reminders/new");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/repeat every \(miles\)/i), "7500");
    await user.type(screen.getByLabelText(/^name$/i), "  Synthetic oil  ");
    await user.click(screen.getByRole("button", { name: /add reminder/i }));

    await waitFor(() => expect(remindersApi.create).toHaveBeenCalled());
    const [vehicleId, body] = vi.mocked(remindersApi.create).mock.calls[0];
    expect(vehicleId).toBe(1);
    expect(body).toMatchObject({
      serviceType: "OilChange",
      name: "Synthetic oil",
      intervalMiles: 7500,
      intervalMonths: null,
      isActive: true,
    });
    expect(await screen.findByText("Reminders list")).toBeInTheDocument();
    expect(store.getState().reminders.reminders).toHaveLength(1);
  });

  it("shows an error and stays on the form when saving fails", async () => {
    vi.mocked(remindersApi.create).mockRejectedValue(new Error("boom"));
    renderRoute("/reminders/new", "/reminders/new");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/repeat every \(miles\)/i), "5000");
    await user.click(screen.getByRole("button", { name: /add reminder/i }));

    expect(await screen.findByText(/failed to save reminder/i)).toBeInTheDocument();
    expect(screen.queryByText("Reminders list")).not.toBeInTheDocument();
  });
});

describe("EditReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a not-found message for an unknown reminder", () => {
    renderRoute("/reminders/:id/edit", "/reminders/99/edit", [existing]);

    expect(screen.getByText(/reminder not found/i)).toBeInTheDocument();
  });

  it("prefills the form and saves changes", async () => {
    vi.mocked(remindersApi.update).mockResolvedValue({ ...existing, intervalMiles: 7500 });
    const { store } = renderRoute("/reminders/:id/edit", "/reminders/7/edit", [existing]);
    const user = userEvent.setup();

    const miles = screen.getByLabelText(/repeat every \(miles\)/i);
    expect(miles).toHaveValue("5,000");
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Oil change");

    await user.clear(miles);
    await user.type(miles, "7500");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(remindersApi.update).toHaveBeenCalled());
    const [vehicleId, id, body] = vi.mocked(remindersApi.update).mock.calls[0];
    expect([vehicleId, id]).toEqual([1, 7]);
    expect(body).toMatchObject({ intervalMiles: 7500, intervalMonths: 6, leadMiles: 500, leadDays: 14 });
    expect(await screen.findByText("Reminders list")).toBeInTheDocument();
    expect(store.getState().reminders.reminders[0].intervalMiles).toBe(7500);
  });
});
