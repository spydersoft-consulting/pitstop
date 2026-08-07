import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { EditFillUp } from "./EditFillUp";
import { fillUpSliceReducer, type FillUp } from "../../store/slices/fillUpSlice";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import type { FillUpRequest } from "../../api/generated/types.gen";

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

const sampleUpdateRequest: FillUpRequest = {
  filledAt: "2026-01-15T12:30:00.000Z",
  odometerReading: 45230,
  gallonsAdded: 12.345,
  fuelGrade: "MidGrade",
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
};

// EditFillUp's job is wiring initialValues/submit/not-found -- FillUpForm's own field
// validation and Calendar interaction are covered separately by FillUpForm.test.tsx.
vi.mock("./FillUpForm", () => ({
  FillUpForm: ({ onSubmit }: { onSubmit: (values: FillUpRequest) => void }) => (
    <button onClick={() => onSubmit(sampleUpdateRequest)}>mock-submit</button>
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

const existingFillUp: FillUp = {
  id: 1,
  vehicleId: 1,
  filledAt: "2026-01-15T12:30:00.000Z",
  odometerReading: 45230,
  gallonsAdded: 12.345,
  fuelGrade: "MidGrade",
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
};

function renderComponent(options: { fillUps?: FillUp[]; selectedVehicleId?: number | null; entryId?: string } = {}) {
  const { fillUps = [existingFillUp], selectedVehicleId = 1, entryId = "1" } = options;
  const store = configureStore({
    reducer: { fillUps: fillUpSliceReducer, vehicles: vehicleSliceReducer },
    preloadedState: {
      fillUps: { recentFillUps: fillUps, loading: false },
      vehicles: { vehicles: [sampleVehicle], selectedVehicleId, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter initialEntries={[`/fill-ups/${entryId}/edit`]}>
      <Provider store={store}>
        <Routes>
          <Route path="/fill-ups/:id/edit" element={<EditFillUp />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("EditFillUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a not-found message when the fill-up doesn't exist in state", () => {
    renderComponent({ fillUps: [], entryId: "999" });
    expect(screen.getByText(/fill-up not found/i)).toBeInTheDocument();
  });

  it("shows a not-found message when no vehicle is selected", () => {
    renderComponent({ selectedVehicleId: null });
    expect(screen.getByText(/fill-up not found/i)).toBeInTheDocument();
  });

  it("renders the title and the selected vehicle's label as the subtitle", () => {
    renderComponent();
    expect(screen.getByText("Edit Fill-Up")).toBeInTheDocument();
    expect(screen.getByText(/2022 Honda Accord/)).toBeInTheDocument();
  });

  it("updates the fill-up and navigates back on success", async () => {
    const user = userEvent.setup();
    vi.mocked(fillUpsApi.update).mockResolvedValue({ ...existingFillUp, odometerReading: 46000 });
    renderComponent();

    await user.click(screen.getByText("mock-submit"));

    expect(fillUpsApi.update).toHaveBeenCalledWith(1, 1, sampleUpdateRequest);
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/fill-ups"));
  });

  it("shows an error message when the update request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fillUpsApi.update).mockRejectedValue(new Error("boom"));
    renderComponent();

    await user.click(screen.getByText("mock-submit"));

    expect(await screen.findByText(/failed to update fill-up/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
