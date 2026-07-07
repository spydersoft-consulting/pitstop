import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Dashboard } from "./Dashboard";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import { fillUpSliceReducer, type FillUp } from "../../store/slices/fillUpSlice";

// PrimeReact's Chart component pulls in chart.js, which doesn't render in jsdom.
// Stub it so Dashboard's chart branches render without exploding.
vi.mock("primereact/chart", () => ({
  Chart: ({ type }: { type: string }) => (
    <div data-testid={`chart-${type}`} />
  ),
}));

interface StateOverrides {
  vehicles?: Vehicle[];
  selectedVehicleId?: number | null;
  recentFillUps?: FillUp[];
}

function renderDashboard(overrides: StateOverrides = {}) {
  const store = configureStore({
    reducer: { vehicles: vehicleSliceReducer, fillUps: fillUpSliceReducer },
    preloadedState: {
      vehicles: {
        vehicles: overrides.vehicles ?? [],
        selectedVehicleId: overrides.selectedVehicleId ?? null,
        loading: false,
      },
      fillUps: {
        recentFillUps: overrides.recentFillUps ?? [],
        loading: false,
      },
    },
  });
  return render(
    <MemoryRouter>
      <Provider store={store}>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  );
}

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

const fillUp = (overrides: Partial<FillUp>): FillUp => ({
  id: 1,
  vehicleId: 1,
  filledAt: "2026-01-01T00:00:00.000Z",
  odometerReading: 1000,
  gallonsAdded: 10,
  pricePerGallon: 3,
  totalCost: 30,
  isFullFillUp: true,
  fuelGrade: "Regular",
  ...overrides,
});

describe("Dashboard", () => {
  it("shows the empty state when no vehicle is selected", () => {
    renderDashboard();
    expect(screen.getByText(/no vehicle selected/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add a vehicle/i }),
    ).toBeInTheDocument();
  });

  it("renders KPI tiles with placeholders when there are no fill-ups", () => {
    renderDashboard({
      vehicles: [sampleVehicle],
      selectedVehicleId: 1,
    });
    expect(screen.getByText("Avg MPG")).toBeInTheDocument();
    expect(screen.getByText("$ / mile")).toBeInTheDocument();
    expect(screen.getByText("Last fill")).toBeInTheDocument();
    expect(screen.getByText("Est. range")).toBeInTheDocument();
    // All four KPI tiles should show the em-dash placeholder when no data is present.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(
      screen.getByText(/no fill-ups recorded yet/i),
    ).toBeInTheDocument();
  });

  it("renders the recent fill-up list when fill-ups exist", () => {
    renderDashboard({
      vehicles: [sampleVehicle],
      selectedVehicleId: 1,
      recentFillUps: [
        fillUp({
          id: 1,
          filledAt: "2026-01-01T00:00:00.000Z",
          totalCost: 42.5,
          pricePerGallon: 3.5,
        }),
        fillUp({
          id: 2,
          filledAt: "2026-02-01T00:00:00.000Z",
          totalCost: 51,
          pricePerGallon: 4,
        }),
      ],
    });

    // Total cost is rendered in both the "Last fill" KPI tile and the recent
    // list, so we expect at least one occurrence per fill-up.
    expect(screen.getAllByText("$51.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("$42.50")).toBeInTheDocument();
    // Per-gallon price is only rendered in the recent list.
    expect(screen.getByText("$4.000/gal")).toBeInTheDocument();
    expect(screen.getByText("$3.500/gal")).toBeInTheDocument();
    expect(screen.getByTestId("chart-bar")).toBeInTheDocument();
  });

  it("renders the MPG trend chart when at least 2 fill-ups have MPG", () => {
    renderDashboard({
      vehicles: [sampleVehicle],
      selectedVehicleId: 1,
      recentFillUps: [
        fillUp({ id: 1, filledAt: "2026-01-01", mpgThisFillUp: 30 }),
        fillUp({ id: 2, filledAt: "2026-02-01", mpgThisFillUp: 32 }),
      ],
    });
    expect(screen.getByTestId("chart-line")).toBeInTheDocument();
  });
});
