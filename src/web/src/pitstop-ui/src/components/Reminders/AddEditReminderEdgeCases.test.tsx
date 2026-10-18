import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AddReminder } from "./AddReminder";
import { EditReminder } from "./EditReminder";
import { reminderSliceReducer, type Reminder } from "../../store/slices/reminderSlice";
import { vehicleSliceReducer } from "../../store/slices/vehicleSlice";

vi.mock("../../api/remindersApi", () => ({
  remindersApi: { create: vi.fn(), update: vi.fn() },
}));

import { remindersApi } from "../../api/remindersApi";

const existing: Reminder = {
  id: 7,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  intervalMiles: 5000,
  intervalMonths: 6,
};

function renderAt(entry: string, selectedVehicleId: number | null, reminders: Reminder[] = []) {
  const store = configureStore({
    reducer: { reminders: reminderSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      reminders: { reminders, templates: [], loading: false },
      vehicles: { vehicles: [], selectedVehicleId, loading: false },
    },
  });
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Provider store={store}>
        <Routes>
          <Route path="/reminders" element={<p>Reminders list</p>} />
          <Route path="/reminders/new" element={<AddReminder />} />
          <Route path="/reminders/:id/edit" element={<EditReminder />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
}

describe("AddReminder edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when no vehicle is selected", async () => {
    renderAt("/reminders/new", null);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/repeat every \(miles\)/i), "5000");
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(remindersApi.create).not.toHaveBeenCalled();
    expect(screen.queryByText("Reminders list")).not.toBeInTheDocument();
  });
});

describe("EditReminder edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says the reminder is missing when no vehicle is selected", () => {
    renderAt("/reminders/7/edit", null, [existing]);

    expect(screen.getByText(/reminder not found/i)).toBeInTheDocument();
  });

  it("shows an error and stays on the form when saving fails", async () => {
    vi.mocked(remindersApi.update).mockRejectedValue(new Error("boom"));
    renderAt("/reminders/7/edit", 1, [existing]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText(/failed to update reminder/i)).toBeInTheDocument();
    await waitFor(() => expect(remindersApi.update).toHaveBeenCalled());
    expect(screen.queryByText("Reminders list")).not.toBeInTheDocument();
  });

  it("fills the form from a reminder that has missing optional fields", () => {
    renderAt("/reminders/7/edit", 1, [{ id: 7, vehicleId: 1, intervalMonths: 12 }]);

    expect(screen.getByLabelText(/repeat every \(months\)/i)).toHaveValue("12");
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("");
    expect(screen.getByLabelText(/send notifications for this reminder/i)).toBeChecked();
  });
});
