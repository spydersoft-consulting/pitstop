import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AddFillUp } from "./AddFillUp";
import { fillUpSliceReducer } from "../../store/slices/fillUpSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import type { CreateFillUpRequest } from "../../api/generated/types.gen";

vi.mock("../../api/fillUpsApi", () => ({
  fillUpsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { fillUpsApi } from "../../api/fillUpsApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const sampleRequest: CreateFillUpRequest = {
  filledAt: "2026-01-15T12:30:00.000Z",
  odometerReading: 45230,
  gallonsAdded: 12.345,
  fuelGrade: "MidGrade",
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
};

// FillUpForm's own validation/Calendar interaction is covered by FillUpForm.test.tsx --
// stub it here so these tests focus on AddFillUp's own submit/error/subtitle logic.
vi.mock("./FillUpForm", () => ({
  FillUpForm: ({ onSubmit }: { onSubmit: (values: CreateFillUpRequest) => void }) => (
    <button onClick={() => onSubmit(sampleRequest)}>mock-submit</button>
  ),
}));

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
    reducer: { fillUps: fillUpSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      fillUps: { recentFillUps: [], loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter>
      <Provider store={store}>
        <AddFillUp />
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("AddFillUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title and the selected vehicle's label as the subtitle", () => {
    renderComponent();
    expect(screen.getByText("Log Fill-Up")).toBeInTheDocument();
    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
  });

  it("creates the fill-up for the selected vehicle and navigates back on success", async () => {
    const user = userEvent.setup();
    vi.mocked(fillUpsApi.create).mockResolvedValue({
      id: 1,
      vehicleId: 1,
      filledAt: sampleRequest.filledAt,
      odometerReading: sampleRequest.odometerReading,
      gallonsAdded: sampleRequest.gallonsAdded,
      fuelGrade: "MidGrade",
      pricePerGallon: sampleRequest.pricePerGallon ?? undefined,
      totalCost: sampleRequest.totalCost ?? undefined,
      isFullFillUp: sampleRequest.isFullFillUp,
    });
    renderComponent(1);

    await user.click(screen.getByText("mock-submit"));

    expect(fillUpsApi.create).toHaveBeenCalledWith(1, sampleRequest);
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/fill-ups"));
  });

  it("shows an error message when the create request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fillUpsApi.create).mockRejectedValue(new Error("boom"));
    renderComponent(1);

    await user.click(screen.getByText("mock-submit"));

    expect(await screen.findByText(/failed to save fill-up/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("does not submit when no vehicle is selected", async () => {
    const user = userEvent.setup();
    renderComponent(null);

    await user.click(screen.getByText("mock-submit"));

    expect(fillUpsApi.create).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
