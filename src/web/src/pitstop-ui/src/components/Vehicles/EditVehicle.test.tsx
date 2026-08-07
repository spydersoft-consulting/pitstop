import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { EditVehicle } from "./EditVehicle";
import { vehicleSliceReducer, type Vehicle } from "../../store/slices/vehicleSlice";
import type { UpdateVehicleRequest } from "../../api/generated/types.gen";

vi.mock("../../api/vehiclesApi", () => ({
  vehiclesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { vehiclesApi } from "../../api/vehiclesApi";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

const sampleUpdateRequest: UpdateVehicleRequest = {
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  plateState: "NY",
  plateNumber: "NEW456",
};

// VehicleForm's own field validation/Calendar interaction is covered by VehicleForm.test.tsx --
// stub it here so these tests focus on EditVehicle's own not-found/submit/error logic.
vi.mock("./VehicleForm", () => ({
  VehicleForm: ({ onSubmit }: { onSubmit: (values: UpdateVehicleRequest) => void }) => (
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
  plateState: "CA",
  plateNumber: "OLD123",
};

function renderComponent(vehicles: Vehicle[] = [sampleVehicle], entryId = "1") {
  const store = configureStore({
    reducer: { vehicles: vehicleSliceReducer },
    preloadedState: {
      vehicles: { vehicles, selectedVehicleId: 1, loading: false },
    },
  });
  const utils = render(
    <MemoryRouter initialEntries={[`/vehicles/${entryId}/edit`]}>
      <Provider store={store}>
        <Routes>
          <Route path="/vehicles/:id/edit" element={<EditVehicle />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  );
  return { store, ...utils };
}

describe("EditVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a not-found message when the vehicle doesn't exist in state", () => {
    renderComponent([], "999");
    expect(screen.getByText(/vehicle not found/i)).toBeInTheDocument();
  });

  it("renders the edit title", () => {
    renderComponent();
    expect(screen.getByText("Edit Vehicle")).toBeInTheDocument();
  });

  it("updates the vehicle and navigates back on success", async () => {
    const user = userEvent.setup();
    vi.mocked(vehiclesApi.update).mockResolvedValue({ ...sampleVehicle, ...sampleUpdateRequest });
    renderComponent();

    await user.click(screen.getByText("mock-submit"));

    expect(vehiclesApi.update).toHaveBeenCalledWith(1, sampleUpdateRequest);
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/vehicles"));
  });

  it("shows an error message when the update request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(vehiclesApi.update).mockRejectedValue(new Error("boom"));
    renderComponent();

    await user.click(screen.getByText("mock-submit"));

    expect(await screen.findByText(/failed to save changes/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
