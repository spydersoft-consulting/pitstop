import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Analytics } from "./Analytics";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import type {
  MaintenanceCostResponse,
  MpgOverTimeResponse,
  SpendResponse,
  SummaryResponse,
} from "../../api/generated/types.gen";

vi.mock("../../api/analyticsApi", () => ({
  analyticsApi: {
    summary: vi.fn(),
    mpg: vi.fn(),
    spend: vi.fn(),
    maintenanceCost: vi.fn(),
  },
}));

// Chart.js needs a real canvas, which jsdom doesn't provide. Render the dataset so tests can assert
// on exactly what each card would plot.
vi.mock("../common/Chart", () => ({
  Chart: ({
    type,
    data,
  }: {
    type: string;
    data: { labels: string[]; datasets: { label: string; data: number[] }[] };
  }) => (
    <div data-testid={`chart-${data.datasets[0].label}`} data-type={type}>
      {JSON.stringify({ labels: data.labels, values: data.datasets[0].data })}
    </div>
  ),
}));

import { analyticsApi } from "../../api/analyticsApi";

const vehicle: Vehicle = {
  id: 1,
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  tankCapacityGallons: 14,
  initialOdometer: 0,
};

const summary: SummaryResponse = {
  vehicleId: 1,
  totalFillUps: 5,
  totalSpend: 210.5,
  overallMpg: 31.25,
  rollingAvgMpg10: 30.5,
};

const mpg: MpgOverTimeResponse = {
  points: [
    { date: "2026-01-01", mpg: 30, rollingAvg: null },
    { date: "2026-02-01", mpg: 32, rollingAvg: 31 },
  ],
};

const spend: SpendResponse = {
  points: [
    { year: 2026, month: 1, totalSpend: 80, totalGallons: 20, fillUpCount: 2 },
    { year: 2026, month: 2, totalSpend: 130.5, totalGallons: 30, fillUpCount: 3 },
  ],
};

const maintenanceCost = (points: MaintenanceCostResponse["points"]): MaintenanceCostResponse => ({ points });

function mockApis(
  overrides: {
    summary?: SummaryResponse;
    maintenance?: MaintenanceCostResponse;
  } = {},
) {
  vi.mocked(analyticsApi.summary).mockResolvedValue(overrides.summary ?? summary);
  vi.mocked(analyticsApi.mpg).mockResolvedValue(mpg);
  vi.mocked(analyticsApi.spend).mockResolvedValue(spend);
  vi.mocked(analyticsApi.maintenanceCost).mockResolvedValue(overrides.maintenance ?? maintenanceCost([]));
}

function renderComponent(selectedVehicleId: number | null = 1) {
  const store = configureStore({
    reducer: { vehicles: vehicleSliceReducer },
    preloadedState: { vehicles: { vehicles: [vehicle], selectedVehicleId, loading: false } },
  });
  return render(
    <Provider store={store}>
      <Analytics />
    </Provider>,
  );
}

const chartValues = (label: string) => JSON.parse(screen.getByTestId(`chart-${label}`).textContent ?? "{}");

describe("Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for a vehicle when none is selected and does not call the API", () => {
    renderComponent(null);

    expect(screen.getByText(/select a vehicle to view analytics/i)).toBeInTheDocument();
    expect(analyticsApi.summary).not.toHaveBeenCalled();
  });

  it("shows the error message when loading fails", async () => {
    vi.mocked(analyticsApi.summary).mockRejectedValue(new Error("boom"));
    vi.mocked(analyticsApi.mpg).mockResolvedValue(mpg);
    vi.mocked(analyticsApi.spend).mockResolvedValue(spend);
    vi.mocked(analyticsApi.maintenanceCost).mockResolvedValue(maintenanceCost([]));
    renderComponent();

    expect(await screen.findByText(/couldn't load analytics/i)).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("falls back to a generic message when a non-Error is thrown", async () => {
    vi.mocked(analyticsApi.summary).mockRejectedValue("nope");
    vi.mocked(analyticsApi.mpg).mockResolvedValue(mpg);
    vi.mocked(analyticsApi.spend).mockResolvedValue(spend);
    vi.mocked(analyticsApi.maintenanceCost).mockResolvedValue(maintenanceCost([]));
    renderComponent();

    expect(await screen.findByText("Failed to load analytics")).toBeInTheDocument();
  });

  it("asks for at least two fill-ups before showing charts", async () => {
    mockApis({ summary: { vehicleId: 1, totalFillUps: 1 } });
    renderComponent();

    expect(await screen.findByText(/log at least two fill-ups/i)).toBeInTheDocument();
    expect(screen.queryByTestId("chart-MPG")).not.toBeInTheDocument();
  });

  it("requests all four analytics for the selected vehicle", async () => {
    mockApis();
    renderComponent(1);

    await screen.findByText("Total fill-ups");

    expect(analyticsApi.summary).toHaveBeenCalledWith(1);
    expect(analyticsApi.mpg).toHaveBeenCalledWith(1);
    expect(analyticsApi.spend).toHaveBeenCalledWith(1);
    expect(analyticsApi.maintenanceCost).toHaveBeenCalledWith(1);
  });

  it("renders the KPI tiles and fuel charts", async () => {
    mockApis();
    renderComponent();

    expect(await screen.findByText("Total fill-ups")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("$210.50")).toBeInTheDocument();
    expect(screen.getByText("31.3")).toBeInTheDocument();

    expect(chartValues("Spend ($)").values).toEqual([80, 130.5]);
    expect(chartValues("Spend ($)").labels).toEqual(["Jan 26", "Feb 26"]);
    expect(chartValues("$/gal").values).toEqual([4, 4.35]);
    expect(chartValues("Gallons / fill").values).toEqual([10, 10]);
    expect(chartValues("MPG").values).toEqual([30, 32]);
  });

  it("shows the empty state on the maintenance card when there is no maintenance spend", async () => {
    mockApis({
      maintenance: maintenanceCost([{ serviceType: "Recall", count: 1, warrantyCount: 1, totalCost: 0 }]),
    });
    renderComponent();

    await screen.findByText("Maintenance Cost by Type");

    expect(screen.queryByTestId("chart-Cost ($)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Not enough data yet.").length).toBeGreaterThan(0);
  });

  it("plots maintenance cost by type with friendly labels, counts and a total", async () => {
    mockApis({
      maintenance: maintenanceCost([
        { serviceType: "OilChange", count: 2, warrantyCount: 0, totalCost: 110 },
        { serviceType: "TireRotation", count: 1, warrantyCount: 0, totalCost: "25" },
        { serviceType: "Recall", count: 1, warrantyCount: 1, totalCost: 0 },
        { serviceType: "MysteryService", count: 3, warrantyCount: 0, totalCost: 15 },
      ]),
    });
    renderComponent();

    await screen.findByText("Maintenance Cost by Type");

    const chart = chartValues("Cost ($)");
    // Zero-cost types (the warranty recall) are not plotted; unknown types keep their raw name.
    expect(chart.labels).toEqual(["Oil Change (2)", "Tire Rotation (1)", "MysteryService (3)"]);
    expect(chart.values).toEqual([110, 25, 15]);
    expect(screen.getByTestId("chart-Cost ($)")).toHaveAttribute("data-type", "bar");
    expect(screen.getByText("$150")).toBeInTheDocument();
  });

  it("limits the maintenance chart to the eight costliest types", async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      serviceType: "Other",
      count: 1,
      warrantyCount: 0,
      totalCost: 100 - i,
    }));
    mockApis({ maintenance: maintenanceCost(points) });
    renderComponent();

    await screen.findByText("Maintenance Cost by Type");

    await waitFor(() => expect(chartValues("Cost ($)").values).toHaveLength(8));
    expect(chartValues("Cost ($)").values[0]).toBe(100);
  });
});
