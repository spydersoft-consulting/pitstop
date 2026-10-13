import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { EditMaintenanceLog } from "./EditMaintenanceLog";
import { maintenanceLogSliceReducer, type MaintenanceLog } from "../../store/slices/maintenanceLogSlice";
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

vi.mock("../../api/maintenanceAttachmentsApi", () => ({
  maintenanceAttachmentsApi: {
    initiate: vi.fn(),
    confirm: vi.fn(),
    getUrl: vi.fn(),
    delete: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
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

const existingLog: MaintenanceLog = {
  id: 1,
  vehicleId: 1,
  serviceDate: "2026-01-01",
  odometerReading: 45230,
  performedBy: "Self",
  items: [{ id: 1, serviceType: "OilChange", isWarrantyWork: false, partsCost: 20, laborCost: 15 }],
  attachments: [],
} as unknown as MaintenanceLog;

function renderComponent(
  options: { logs?: MaintenanceLog[]; selectedVehicleId?: number | null; entryId?: string } = {},
) {
  const { logs = [existingLog], selectedVehicleId = 1, entryId = "1" } = options;
  const store = configureStore({
    reducer: { maintenanceLogs: maintenanceLogSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      maintenanceLogs: { recentMaintenanceLogs: logs, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter initialEntries={[`/maintenance/${entryId}/edit`]}>
      <Provider store={store}>
        <Routes>
          <Route path="/maintenance/:id/edit" element={<EditMaintenanceLog />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("EditMaintenanceLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a not-found message when the log doesn't exist in state", () => {
    renderComponent({ logs: [], entryId: "999" });
    expect(screen.getByText(/maintenance log not found/i)).toBeInTheDocument();
  });

  it("shows a not-found message when no vehicle is selected", () => {
    renderComponent({ selectedVehicleId: null });
    expect(screen.getByText(/maintenance log not found/i)).toBeInTheDocument();
  });

  it("renders the form pre-filled and the attachments section", () => {
    renderComponent();
    expect(screen.getByText("Edit Maintenance Log")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45,230")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByText("Attachments")).toBeInTheDocument();
  });

  it("updates the log and navigates back on success", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceLogsApi.update).mockResolvedValue({ ...existingLog, odometerReading: 46000 });
    renderComponent();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(maintenanceLogsApi.update).toHaveBeenCalledWith(1, 1, expect.objectContaining({ odometerReading: 45230 }));
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/maintenance"));
  });

  it("loads every service of the visit and submits them unchanged", async () => {
    const user = userEvent.setup();
    const multi = {
      ...existingLog,
      location: { id: 9, name: "Joe's Garage", address: "1 Main St" },
      notes: "Dealer visit",
      items: [
        {
          id: 1,
          serviceType: "OilChange",
          description: "Synthetic",
          isWarrantyWork: false,
          partsCost: 30,
          laborCost: 20,
        },
        { id: 2, serviceType: "TireRotation", isWarrantyWork: false, totalCost: 25 },
        { id: 3, serviceType: "Recall", description: "NHTSA 24V-123", isWarrantyWork: true },
      ],
    } as unknown as MaintenanceLog;
    vi.mocked(maintenanceLogsApi.update).mockResolvedValue(multi);
    renderComponent({ logs: [multi] });

    expect(screen.getByTestId("service-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("service-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("service-item-2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Synthetic")).toBeInTheDocument();
    expect(screen.getByTestId("visit-total")).toHaveTextContent("Visit total: $75.00");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(maintenanceLogsApi.update).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({
        locationId: 9,
        notes: "Dealer visit",
        items: [
          {
            serviceType: "OilChange",
            description: "Synthetic",
            isWarrantyWork: false,
            partsCost: 30,
            laborCost: 20,
            totalCost: null,
          },
          {
            serviceType: "TireRotation",
            description: null,
            isWarrantyWork: false,
            partsCost: null,
            laborCost: null,
            totalCost: 25,
          },
          {
            serviceType: "Recall",
            description: "NHTSA 24V-123",
            isWarrantyWork: true,
            partsCost: null,
            laborCost: null,
            totalCost: null,
          },
        ],
      }),
    );
  });

  it("removes a service before saving", async () => {
    const user = userEvent.setup();
    const multi = {
      ...existingLog,
      items: [
        { id: 1, serviceType: "OilChange", isWarrantyWork: false },
        { id: 2, serviceType: "BrakePads", isWarrantyWork: false },
      ],
    } as unknown as MaintenanceLog;
    vi.mocked(maintenanceLogsApi.update).mockResolvedValue(multi);
    renderComponent({ logs: [multi] });

    await user.click(screen.getByRole("button", { name: "Remove service 2" }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const body = vi.mocked(maintenanceLogsApi.update).mock.calls[0][2];
    expect(body.items).toHaveLength(1);
    expect(body.items[0].serviceType).toBe("OilChange");
  });

  it("falls back to one empty service when the log has none", () => {
    const bare = { ...existingLog, items: [] } as unknown as MaintenanceLog;
    renderComponent({ logs: [bare] });

    expect(screen.getByTestId("service-item-0")).toBeInTheDocument();
    expect(screen.queryByTestId("service-item-1")).not.toBeInTheDocument();
  });

  it("shows an error message when the update request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceLogsApi.update).mockRejectedValue(new Error("boom"));
    renderComponent();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/failed to update maintenance log/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
