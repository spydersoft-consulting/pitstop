import { selectOption } from "../../test-utils/selectOption";
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
vi.mock("../ui/confirmPopupStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ui/confirmPopupStore")>();
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
  performedBy: "Self",
  items: [{ id: 1, serviceType: "OilChange", isWarrantyWork: false, computedTotalCost: 65.5 }],
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
    renderComponent([
      maintenanceLog({ items: [{ id: 1, serviceType: "OilChange", isWarrantyWork: true, computedTotalCost: 65.5 }] }),
    ]);

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

  describe("services on a visit", () => {
    const multiItemLog = (overrides: Partial<MaintenanceLog> = {}) =>
      maintenanceLog({
        id: 5,
        performedBy: "Shop",
        location: { id: 3, name: "Joe's Garage" },
        notes: "Dealer visit",
        computedTotalCost: 75,
        items: [
          { id: 1, serviceType: "OilChange", isWarrantyWork: false, computedTotalCost: 50 },
          { id: 2, serviceType: "TireRotation", isWarrantyWork: false, computedTotalCost: 25 },
          { id: 3, serviceType: "Recall", description: "NHTSA 24V-123", isWarrantyWork: true },
        ],
        ...overrides,
      });

    const openCard = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByText(/Oil Change, Tire Rotation, Recall · Shop/));
    };

    it("lists every service of the visit on the mobile card summary", () => {
      renderComponent([multiItemLog()]);

      expect(screen.getByText(/Oil Change, Tire Rotation, Recall · Shop/)).toBeInTheDocument();
      expect(screen.getAllByText("$75.00").length).toBeGreaterThan(0);
    });

    it("shows a placeholder when a visit has no services", () => {
      renderComponent([maintenanceLog({ items: undefined })]);

      expect(screen.getByText(/^— · Self$/)).toBeInTheDocument();
    });

    it("shows a warranty badge only on the warranty service", () => {
      renderComponent([multiItemLog()]);

      // One badge in the desktop table chips (the mobile card's badge appears once expanded).
      expect(screen.getAllByText("Warranty")).toHaveLength(1);
    });

    it("expands the card to show per-service cost, description, location, odometer and notes", async () => {
      const user = userEvent.setup();
      renderComponent([multiItemLog()]);

      await openCard(user);

      expect(screen.getByText("Services", { selector: "span.block" })).toBeInTheDocument();
      expect(screen.getByText("NHTSA 24V-123")).toBeInTheDocument();
      expect(screen.getByText("$50.00")).toBeInTheDocument();
      expect(screen.getByText("$25.00")).toBeInTheDocument();
      expect(screen.getByText("Joe's Garage", { selector: "span.truncate" })).toBeInTheDocument();
      expect(screen.getByText("Dealer visit")).toBeInTheDocument();
      expect(screen.getByText(/45,230 mi/, { selector: "span.font-numeric" })).toBeInTheDocument();
      // desktop chip + expanded mobile row
      expect(screen.getAllByText("Warranty")).toHaveLength(2);
    });

    it("collapses an expanded card when its header is clicked again", async () => {
      const user = userEvent.setup();
      renderComponent([multiItemLog()]);

      await openCard(user);
      expect(screen.getByText("Services", { selector: "span.block" })).toBeInTheDocument();
      await openCard(user);

      expect(screen.queryByText("Services", { selector: "span.block" })).not.toBeInTheDocument();
    });

    it("edits and deletes from the expanded mobile card", async () => {
      const user = userEvent.setup();
      renderComponent([multiItemLog()]);

      await openCard(user);
      await user.click(screen.getByRole("button", { name: "Edit" }));
      expect(navigateMock).toHaveBeenCalledWith("/maintenance/5/edit");

      await user.click(screen.getByRole("button", { name: "Delete" }));
      capturedAccept!();
      expect(maintenanceLogsApi.delete).toHaveBeenCalledWith(1, 5);
    });
  });

  describe("filters", () => {
    const logs = () => [
      maintenanceLog({
        id: 1,
        serviceDate: "2026-01-10",
        performedBy: "Shop",
        items: [
          { id: 1, serviceType: "OilChange", computedTotalCost: 50 },
          { id: 2, serviceType: "TireRotation", computedTotalCost: 25 },
        ],
        computedTotalCost: 75,
      }),
      maintenanceLog({
        id: 2,
        serviceDate: "2026-03-10",
        performedBy: "Self",
        items: [{ id: 3, serviceType: "WiperBlades", computedTotalCost: 20 }],
        computedTotalCost: 20,
      }),
    ];

    const pick = async (user: ReturnType<typeof userEvent.setup>, placeholder: string, option: string) => {
      await selectOption(user, screen.getAllByText(placeholder)[0].closest("button")!, option);
    };

    it("filters by service type, matching any service on the visit", async () => {
      const user = userEvent.setup();
      renderComponent(logs());
      expect(screen.getAllByText("1/10/2026").length).toBeGreaterThan(0);
      expect(screen.getAllByText("3/10/2026").length).toBeGreaterThan(0);

      await pick(user, "All types", "Tire Rotation");

      expect(screen.getAllByText("1/10/2026").length).toBeGreaterThan(0);
      expect(screen.queryByText("3/10/2026")).not.toBeInTheDocument();
    });

    it("filters by performed by", async () => {
      const user = userEvent.setup();
      renderComponent(logs());

      await pick(user, "Anyone", "Self");

      expect(screen.queryByText("1/10/2026")).not.toBeInTheDocument();
      expect(screen.getAllByText("3/10/2026").length).toBeGreaterThan(0);
    });

    it("summarizes the count and spend of the filtered view", async () => {
      const user = userEvent.setup();
      renderComponent(logs());
      expect(screen.getAllByText("$95.00").length).toBeGreaterThan(0);

      await pick(user, "All types", "Wiper Blades");

      expect(screen.getAllByText("$20.00").length).toBeGreaterThan(0);
      expect(screen.queryByText("$95.00")).not.toBeInTheDocument();
    });

    it("shows a no-match message when the filters exclude everything", async () => {
      const user = userEvent.setup();
      renderComponent(logs());

      await pick(user, "All types", "Brake Pads");

      expect(screen.getAllByText(/no maintenance logs match the current filter/i).length).toBeGreaterThan(0);
    });
  });
});
