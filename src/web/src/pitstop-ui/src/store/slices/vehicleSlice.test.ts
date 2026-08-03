import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  vehicleSliceReducer,
  setVehicles,
  selectVehicle,
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  type Vehicle,
} from "./vehicleSlice";

vi.mock("../../api/vehiclesApi", () => ({
  vehiclesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { vehiclesApi } from "../../api/vehiclesApi";

const v = (id: number, overrides: Partial<Vehicle> = {}): Vehicle =>
  ({
    id,
    name: `v${id}`,
    year: 2020,
    make: "Honda",
    model: "Accord",
    trim: null,
    tankCapacityGallons: 14,
    initialOdometer: 0,
    ...overrides,
  }) as Vehicle;

function makeStore() {
  return configureStore({ reducer: { vehicles: vehicleSliceReducer } });
}

describe("vehicleSlice reducers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setVehicles selects the first vehicle when none is selected", () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1), v(2)]));
    const state = store.getState().vehicles;
    expect(state.vehicles).toHaveLength(2);
    expect(state.selectedVehicleId).toBe(1);
  });

  it("setVehicles preserves an already-selected vehicle id", () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1), v(2)]));
    store.dispatch(selectVehicle(2));
    store.dispatch(setVehicles([v(3), v(4)]));
    expect(store.getState().vehicles.selectedVehicleId).toBe(2);
  });

  it("selectVehicle updates the selected id", () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1), v(2)]));
    store.dispatch(selectVehicle(2));
    expect(store.getState().vehicles.selectedVehicleId).toBe(2);
  });
});

describe("vehicleSlice thunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchVehicles populates state and auto-selects the first one", async () => {
    vi.mocked(vehiclesApi.list).mockResolvedValue([v(10), v(11)]);
    const store = makeStore();
    await store.dispatch(fetchVehicles());
    const state = store.getState().vehicles;
    expect(state.vehicles).toHaveLength(2);
    expect(state.selectedVehicleId).toBe(10);
    expect(state.loading).toBe(false);
  });

  it("fetchVehicles.rejected clears the loading flag", async () => {
    vi.mocked(vehiclesApi.list).mockRejectedValue(new Error("boom"));
    const store = makeStore();
    await store.dispatch(fetchVehicles());
    expect(store.getState().vehicles.loading).toBe(false);
  });

  it("createVehicle appends and auto-selects when nothing was selected", async () => {
    vi.mocked(vehiclesApi.create).mockResolvedValue(v(20));
    const store = makeStore();
    await store.dispatch(createVehicle({ name: "new", make: "Honda", model: "Civic" }));
    const state = store.getState().vehicles;
    expect(state.vehicles.map((x) => x.id)).toEqual([20]);
    expect(state.selectedVehicleId).toBe(20);
  });

  it("updateVehicle replaces the matching vehicle by id", async () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1, { name: "old" }), v(2)]));
    vi.mocked(vehiclesApi.update).mockResolvedValue(v(1, { name: "new" }));
    await store.dispatch(
      updateVehicle({
        id: 1,
        body: { name: "new", make: "Honda", model: "Accord" },
      }),
    );
    expect(store.getState().vehicles.vehicles[0].name).toBe("new");
  });

  it("deleteVehicle removes the vehicle and reassigns selection", async () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1), v(2)]));
    vi.mocked(vehiclesApi.delete).mockResolvedValue(undefined);
    await store.dispatch(deleteVehicle(1));
    const state = store.getState().vehicles;
    expect(state.vehicles.map((x) => x.id)).toEqual([2]);
    expect(state.selectedVehicleId).toBe(2);
  });

  it("deleteVehicle clears selection when the last vehicle is removed", async () => {
    const store = makeStore();
    store.dispatch(setVehicles([v(1)]));
    vi.mocked(vehiclesApi.delete).mockResolvedValue(undefined);
    await store.dispatch(deleteVehicle(1));
    const state = store.getState().vehicles;
    expect(state.vehicles).toHaveLength(0);
    expect(state.selectedVehicleId).toBeNull();
  });
});
