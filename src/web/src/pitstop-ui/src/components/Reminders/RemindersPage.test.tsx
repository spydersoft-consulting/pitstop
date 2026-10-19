import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { RemindersPage } from "./RemindersPage";
import { reminderSliceReducer, type Reminder, type ReminderTemplate } from "../../store/slices/reminderSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import { maintenanceLogSliceReducer } from "../../store/slices/maintenanceLogSlice";

vi.mock("../../api/remindersApi", () => ({
  remindersApi: {
    list: vi.fn(),
    templates: vi.fn(),
    create: vi.fn(),
    createFromTemplates: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn(),
    snooze: vi.fn(),
  },
}));

import { remindersApi } from "../../api/remindersApi";
import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../../api/maintenanceLogsApi", () => ({
  maintenanceLogsApi: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

let capturedAccept: (() => void) | null = null;
vi.mock("primereact/confirmpopup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("primereact/confirmpopup")>();
  return {
    ...actual,
    confirmPopup: vi.fn((options: { accept?: () => void }) => {
      capturedAccept = options.accept ?? null;
    }),
  };
});

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

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 1,
  vehicleId: 1,
  serviceType: "OilChange",
  name: "Oil change",
  intervalMiles: 5000,
  intervalMonths: 6,
  status: "DueSoon",
  lastServiceDate: "2026-01-15",
  lastServiceOdometer: 40000,
  nextDueOdometer: 45000,
  nextDueDate: "2026-07-15",
  estimatedOdometer: 44600,
  isOdometerEstimated: true,
  ...overrides,
});

const templates: ReminderTemplate[] = [
  { serviceType: "OilChange", name: "Oil change", intervalMiles: 5000, intervalMonths: 6 },
  { serviceType: "TireRotation", name: "Tire rotation", intervalMiles: 6000, intervalMonths: 6 },
];

function renderPage(reminders: Reminder[] = [], selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: {
      reminders: reminderSliceReducer,
      vehicles: vehicleSliceReducer,
      maintenanceLogs: maintenanceLogSliceReducer,
    },
    preloadedState: {
      reminders: { reminders, templates, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <RemindersPage />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("RemindersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAccept = null;
  });

  it("shows the empty state with the vehicle subtitle", () => {
    renderPage([]);
    expect(screen.getByText("Maintenance Reminders")).toBeInTheDocument();
    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
    expect(screen.getByText(/no maintenance reminders yet/i)).toBeInTheDocument();
  });

  it("renders each reminder with its status, interval and due values", () => {
    renderPage([
      reminder(),
      reminder({ id: 2, name: "Tire rotation", serviceType: "TireRotation", status: "Overdue" }),
    ]);

    expect(screen.getByText("Oil change")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getAllByText(/Every 5,000 mi or 6 mo/)).toHaveLength(2);
    expect(screen.getAllByText(/45,000 mi/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\(est\.\)/)).toHaveLength(2);
  });

  it("shows the snooze end date when snoozed", () => {
    renderPage([reminder({ status: "Snoozed", snoozedUntil: "2026-08-01" })]);

    expect(screen.getByText("Snoozed")).toBeInTheDocument();
    expect(screen.getByText(/Notifications snoozed until/)).toBeInTheDocument();
  });

  it("marks a reminder done with the entered date and odometer", async () => {
    vi.mocked(remindersApi.complete).mockResolvedValue(reminder({ status: "Ok", lastServiceOdometer: 44600 }));
    const { store } = renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /mark done/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^mark done$/i }));

    await waitFor(() => expect(remindersApi.complete).toHaveBeenCalled());
    const [vehicleId, id, body] = vi.mocked(remindersApi.complete).mock.calls[0];
    expect(vehicleId).toBe(1);
    expect(id).toBe(1);
    expect(body.odometer).toBe(44600);
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.performedBy).toBe("Self");
    await waitFor(() => expect(store.getState().reminders.reminders[0].status).toBe("Ok"));
    await waitFor(() => expect(maintenanceLogsApi.list).toHaveBeenCalledWith(1, expect.anything()));
  });

  it("lets the owner record who performed the service", async () => {
    vi.mocked(remindersApi.complete).mockResolvedValue(reminder({ status: "Ok" }));
    renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /mark done/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(dialog.querySelector(".p-dropdown")!);
    await user.click(document.querySelector<HTMLElement>('li[aria-label="Shop"]')!);
    await user.click(within(dialog).getByRole("button", { name: /^mark done$/i }));

    await waitFor(() => expect(remindersApi.complete).toHaveBeenCalled());
    expect(vi.mocked(remindersApi.complete).mock.calls[0][2].performedBy).toBe("Shop");
  });

  it("snoozes a reminder", async () => {
    vi.mocked(remindersApi.snooze).mockResolvedValue(reminder({ status: "Snoozed", snoozedUntil: "2026-12-01" }));
    const { store } = renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /snooze/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^snooze$/i }));

    await waitFor(() => expect(remindersApi.snooze).toHaveBeenCalled());
    await waitFor(() => expect(store.getState().reminders.reminders[0].status).toBe("Snoozed"));
  });

  it("deletes a reminder after confirmation", async () => {
    const { store } = renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /delete oil change/i }));
    capturedAccept?.();

    await waitFor(() => expect(remindersApi.delete).toHaveBeenCalledWith(1, 1));
    await waitFor(() => expect(store.getState().reminders.reminders).toHaveLength(0));
  });

  it("offers only templates that don't already have a reminder, and creates the selected ones", async () => {
    vi.mocked(remindersApi.createFromTemplates).mockResolvedValue([
      reminder({ id: 9, serviceType: "TireRotation", name: "Tire rotation" }),
    ]);
    const { store } = renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /add common services/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/oil change/i)).not.toBeInTheDocument();

    await user.click(within(dialog).getByLabelText(/tire rotation/i));
    await user.click(within(dialog).getByRole("button", { name: /^add 1$/i }));

    await waitFor(() => expect(remindersApi.createFromTemplates).toHaveBeenCalledWith(1, ["TireRotation"]));
    await waitFor(() => expect(store.getState().reminders.reminders).toHaveLength(2));
  });

  it("navigates to the add and edit screens", async () => {
    renderPage([reminder()]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^add reminder$/i }));
    expect(navigateMock).toHaveBeenCalledWith("/reminders/new");

    await user.click(screen.getByRole("button", { name: /edit oil change/i }));
    expect(navigateMock).toHaveBeenCalledWith("/reminders/1/edit");
  });

  it("does not call the API when no vehicle is selected", async () => {
    const { store } = renderPage([reminder()], null);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /delete oil change/i }));
    capturedAccept?.();

    expect(remindersApi.delete).not.toHaveBeenCalled();
    expect(store.getState().reminders.reminders).toHaveLength(1);
  });
});
