import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AddMaintenanceLog } from "./AddMaintenanceLog";
import { maintenanceLogSliceReducer } from "../../store/slices/maintenanceLogSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";

vi.mock("../../api/locationsApi", () => ({
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("../../api/maintenanceLogsApi", () => ({
  maintenanceLogsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
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

function renderComponent(selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: { maintenanceLogs: maintenanceLogSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      maintenanceLogs: { recentMaintenanceLogs: [], loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <AddMaintenanceLog />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

async function fillRequiredFieldsAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("e.g. 45230"), "45230");
  await user.click(screen.getByRole("button", { name: /add maintenance log/i }));
}

describe("AddMaintenanceLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form and the attachments hint", () => {
    renderComponent();
    expect(screen.getByText("Log Maintenance")).toBeInTheDocument();
    expect(screen.getByText(/save this entry to attach receipts or photos/i)).toBeInTheDocument();
  });

  it("creates the log for the selected vehicle and navigates back on success", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceLogsApi.create).mockResolvedValue({
      id: 1,
      vehicleId: 1,
      serviceDate: "2026-01-01",
      odometerReading: 45230,
      serviceType: "OilChange",
      performedBy: "Self",
    });
    renderComponent(1);

    await fillRequiredFieldsAndSubmit(user);

    expect(maintenanceLogsApi.create).toHaveBeenCalledWith(1, expect.objectContaining({ odometerReading: 45230 }));
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/maintenance"));
  });

  it("shows an error message when the create request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceLogsApi.create).mockRejectedValue(new Error("boom"));
    renderComponent(1);

    await fillRequiredFieldsAndSubmit(user);

    expect(await screen.findByText(/failed to save maintenance log/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("does not submit when no vehicle is selected", async () => {
    const user = userEvent.setup();
    renderComponent(null);

    await fillRequiredFieldsAndSubmit(user);

    expect(maintenanceLogsApi.create).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
