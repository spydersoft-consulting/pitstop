import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MaintenanceLogHistory } from "./MaintenanceLogHistory";
import { maintenanceLogSliceReducer, type MaintenanceLog } from "../../store/slices/maintenanceLogSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";

vi.mock("../../api/maintenanceLogsApi", () => ({
  maintenanceLogsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

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

const maintenanceLog = (overrides: Partial<MaintenanceLog> = {}): MaintenanceLog => ({
  id: 1,
  vehicleId: 1,
  serviceDate: "2026-01-15",
  odometerReading: 45230,
  serviceType: "OilChange",
  performedBy: "Self",
  isWarrantyWork: false,
  computedTotalCost: 65.5,
  attachments: [],
  ...overrides,
});

function renderComponent(logs: MaintenanceLog[] = [], selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: { maintenanceLogs: maintenanceLogSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      maintenanceLogs: { recentMaintenanceLogs: logs, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <MaintenanceLogHistory />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("MaintenanceLogHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAccept = null;
  });

  it("shows the empty state with the vehicle subtitle when there are no logs", () => {
    renderComponent([]);
    expect(screen.getByText("Maintenance History")).toBeInTheDocument();
    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
    expect(screen.getByText(/no maintenance logs recorded yet/i)).toBeInTheDocument();
  });

  it("navigates to /maintenance/new from the empty state's primary action", async () => {
    const user = userEvent.setup();
    renderComponent([]);

    await user.click(screen.getByRole("button", { name: /log your first maintenance/i }));

    expect(navigateMock).toHaveBeenCalledWith("/maintenance/new");
  });

  it("renders formatted values, including a warranty badge, for a populated list", () => {
    renderComponent([maintenanceLog({ isWarrantyWork: true })]);

    expect(screen.getAllByText("$65.50").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/45,230 mi/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warranty").length).toBeGreaterThan(0);
  });

  it("navigates to /maintenance/new from the header Add button", async () => {
    const user = userEvent.setup();
    renderComponent([maintenanceLog()]);

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(navigateMock).toHaveBeenCalledWith("/maintenance/new");
  });

  it("navigates to the edit route when an edit action is used", async () => {
    const user = userEvent.setup();
    renderComponent([maintenanceLog({ id: 7 })]);

    const editButtons = screen.getAllByRole("button", { name: /edit maintenance log/i });
    await user.click(editButtons[0]);

    expect(navigateMock).toHaveBeenCalledWith("/maintenance/7/edit");
  });

  it("deletes the log once the confirm popup is accepted", async () => {
    const user = userEvent.setup();
    renderComponent([maintenanceLog({ id: 7 })]);

    const deleteButtons = screen.getAllByRole("button", { name: /delete maintenance log/i });
    await user.click(deleteButtons[0]);

    expect(capturedAccept).not.toBeNull();
    capturedAccept!();

    expect(maintenanceLogsApi.delete).toHaveBeenCalledWith(1, 7);
  });

  it("toggles the mobile filters panel", async () => {
    const user = userEvent.setup();
    renderComponent([maintenanceLog()]);

    const initialCount = screen.getAllByText("Service type").length;
    await user.click(screen.getByText(/filters & summary/i));
    expect(screen.getAllByText("Service type").length).toBeGreaterThan(initialCount);
  });
});
