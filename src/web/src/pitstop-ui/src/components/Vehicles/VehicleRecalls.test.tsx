import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { VehicleRecalls } from "./VehicleRecalls";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import type { RecallDto } from "../../api/generated/types.gen";

vi.mock("../../api/vehiclesApi", () => ({
  vehiclesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    recalls: vi.fn(),
  },
}));

import { vehiclesApi } from "../../api/vehiclesApi";

const sampleVehicle: Vehicle = {
  id: 1,
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  tankCapacityGallons: 14,
  initialOdometer: 0,
  plateState: "CA",
  plateNumber: "OLD123",
  vin: "1HGCM82633A123456",
};

const sampleRecall: RecallDto = {
  campaignNumber: "24V123000",
  manufacturer: "Honda",
  component: "STEERING",
  summary: "The steering column may fail.",
  consequence: "Loss of steering control increases the risk of a crash.",
  remedy: "Dealers will replace the steering column, free of charge.",
  notes: null,
  parkIt: false,
  parkOutside: false,
};

function renderComponent(vehicles: Vehicle[] = [sampleVehicle], entryId = "1") {
  const store = configureStore({
    reducer: { vehicles: vehicleSliceReducer },
    preloadedState: {
      vehicles: { vehicles, selectedVehicleId: 1, loading: false },
    },
  });
  return render(
    <MemoryRouter initialEntries={[`/vehicles/${entryId}/recalls`]}>
      <Provider store={store}>
        <Routes>
          <Route path="/vehicles/:id/recalls" element={<VehicleRecalls />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
}

describe("VehicleRecalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a not-found message when the vehicle doesn't exist in state", () => {
    renderComponent([], "999");
    expect(screen.getByText(/vehicle not found/i)).toBeInTheDocument();
  });

  it("renders recall details once loaded", async () => {
    vi.mocked(vehiclesApi.recalls).mockResolvedValue([sampleRecall]);
    renderComponent();

    expect(await screen.findByText("STEERING")).toBeInTheDocument();
    expect(screen.getByText(/campaign 24v123000/i)).toBeInTheDocument();
    expect(screen.getByText(sampleRecall.summary!)).toBeInTheDocument();
    expect(vehiclesApi.recalls).toHaveBeenCalledWith(1);
  });

  it("shows a park-it badge when applicable", async () => {
    vi.mocked(vehiclesApi.recalls).mockResolvedValue([{ ...sampleRecall, parkIt: true }]);
    renderComponent();

    expect(await screen.findByText("Park It")).toBeInTheDocument();
  });

  it("shows an empty state when there are no open recalls", async () => {
    vi.mocked(vehiclesApi.recalls).mockResolvedValue([]);
    renderComponent();

    expect(await screen.findByText(/no open recalls/i)).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(vehiclesApi.recalls).mockRejectedValue(new Error("boom"));
    renderComponent();

    expect(await screen.findByText(/unable to load recalls/i)).toBeInTheDocument();
  });
});
