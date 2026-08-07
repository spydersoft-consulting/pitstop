import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { FillUpHistory } from "./FillUpHistory";
import { fillUpSliceReducer, type FillUp } from "../../store/slices/fillUpSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";

vi.mock("../../api/fillUpsApi", () => ({
  fillUpsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

import { fillUpsApi } from "../../api/fillUpsApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

// confirmPopup is an imperative call (renders via portal), not something RTL can click through
// naturally -- capture the options it's called with and invoke `accept` directly to simulate
// the user confirming.
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

const fillUp = (overrides: Partial<FillUp> = {}): FillUp => ({
  id: 1,
  vehicleId: 1,
  filledAt: "2026-01-15T12:30:00.000Z",
  odometerReading: 45230,
  gallonsAdded: 12.345,
  fuelGrade: "MidGrade",
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
  ...overrides,
});

function renderComponent(fillUps: FillUp[] = [], selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: { fillUps: fillUpSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      fillUps: { recentFillUps: fillUps, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <FillUpHistory />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("FillUpHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAccept = null;
  });

  it("shows the empty state with the vehicle subtitle when there are no fill-ups", () => {
    renderComponent([]);
    expect(screen.getByText("Fill-Up History")).toBeInTheDocument();
    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
    expect(screen.getByText(/no fill-ups recorded yet/i)).toBeInTheDocument();
  });

  it("navigates to /fill-ups/new from the empty state's primary action", async () => {
    const user = userEvent.setup();
    renderComponent([]);

    await user.click(screen.getByRole("button", { name: /log your first fill-up/i }));

    expect(navigateMock).toHaveBeenCalledWith("/fill-ups/new");
  });

  it("renders formatted values for a populated list", () => {
    renderComponent([fillUp()]);

    expect(screen.getAllByText("$42.71").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/45,230 mi/).length).toBeGreaterThan(0);
  });

  it("navigates to /fill-ups/new from the header Add button", async () => {
    const user = userEvent.setup();
    renderComponent([fillUp()]);

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(navigateMock).toHaveBeenCalledWith("/fill-ups/new");
  });

  it("navigates to the edit route when an edit action is used", async () => {
    const user = userEvent.setup();
    renderComponent([fillUp({ id: 7 })]);

    const editButtons = screen.getAllByRole("button", { name: /edit fill-up/i });
    await user.click(editButtons[0]);

    expect(navigateMock).toHaveBeenCalledWith("/fill-ups/7/edit");
  });

  it("deletes the fill-up once the confirm popup is accepted", async () => {
    const user = userEvent.setup();
    renderComponent([fillUp({ id: 7 })]);

    const deleteButtons = screen.getAllByRole("button", { name: /delete fill-up/i });
    await user.click(deleteButtons[0]);

    expect(capturedAccept).not.toBeNull();
    capturedAccept!();

    expect(fillUpsApi.delete).toHaveBeenCalledWith(1, 7);
  });

  it("toggles the mobile filters panel", async () => {
    const user = userEvent.setup();
    renderComponent([fillUp()]);

    // The desktop filter rail always renders one "Date range" panel (jsdom doesn't apply the
    // `hidden lg:block` breakpoint styling); toggling the mobile panel adds a second.
    const initialCount = screen.getAllByText("Date range").length;
    await user.click(screen.getByText(/filters & summary/i));
    expect(screen.getAllByText("Date range").length).toBeGreaterThan(initialCount);
  });
});
