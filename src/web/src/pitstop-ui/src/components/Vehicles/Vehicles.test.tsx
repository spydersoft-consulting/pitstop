import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Vehicles } from "./Vehicles";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import { fillUpSliceReducer, type FillUp } from "../../store/slices/fillUpSlice";

vi.mock("../../api/vehiclesApi", () => ({
  vehiclesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

import { vehiclesApi } from "../../api/vehiclesApi";

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

const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 1,
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  tankCapacityGallons: 14,
  initialOdometer: 12345,
  ...overrides,
});

const fillUp = (overrides: Partial<FillUp> = {}): FillUp => ({
  id: 1,
  vehicleId: 1,
  filledAt: "2026-01-15T12:30:00.000Z",
  odometerReading: 45230,
  gallonsAdded: 12.345,
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
  ...overrides,
});

function renderComponent(vehicles: Vehicle[] = [], selectedVehicleId: number | null = null, fillUps: FillUp[] = []) {
  const store = configureStore({
    reducer: { vehicles: vehicleSliceReducer, fillUps: fillUpSliceReducer },
    preloadedState: {
      vehicles: { vehicles, selectedVehicleId, loading: false },
      fillUps: { recentFillUps: fillUps, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <Vehicles />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("Vehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAccept = null;
  });

  it("shows the add tile when there are no vehicles", () => {
    renderComponent([]);
    expect(screen.getByText(/add your first vehicle/i)).toBeInTheDocument();
  });

  it("renders vehicle cards with the plate when set", () => {
    renderComponent([vehicle({ plateState: "CA", plateNumber: "8ABC123" })], 1);

    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
    expect(screen.getByText(/CA · 8ABC123/)).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("omits the plate line when no plate is set", () => {
    renderComponent([vehicle({ plateState: null, plateNumber: null })], 1);
    expect(screen.queryByText(/·.*\d/)).not.toBeInTheDocument();
  });

  it("shows an MPG badge for the selected vehicle when fill-ups have MPG data", () => {
    renderComponent([vehicle()], 1, [fillUp({ mpgThisFillUp: 28.4 })]);
    expect(screen.getByText(/28\.4 mpg/)).toBeInTheDocument();
  });

  it("navigates to /vehicles/new from the header Add button", async () => {
    const user = userEvent.setup();
    renderComponent([vehicle()], 1);

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(navigateMock).toHaveBeenCalledWith("/vehicles/new");
  });

  it("navigates to the edit route when the edit action is used", async () => {
    const user = userEvent.setup();
    renderComponent([vehicle({ id: 7 })], 7);

    await user.click(screen.getByRole("button", { name: /edit vehicle/i }));

    expect(navigateMock).toHaveBeenCalledWith("/vehicles/7/edit");
  });

  it("selects a vehicle when its card is clicked", async () => {
    const user = userEvent.setup();
    const { store } = renderComponent([vehicle({ id: 1 }), vehicle({ id: 2, name: "Second Car" })], 1);

    await user.click(screen.getByText(/Second Car/));

    expect(store.getState().vehicles.selectedVehicleId).toBe(2);
  });

  it("deletes the vehicle once the confirm popup is accepted", async () => {
    const user = userEvent.setup();
    renderComponent([vehicle({ id: 7 })], 7);

    await user.click(screen.getByRole("button", { name: /delete vehicle/i }));

    expect(capturedAccept).not.toBeNull();
    capturedAccept!();

    expect(vehiclesApi.delete).toHaveBeenCalledWith(7);
  });
});
