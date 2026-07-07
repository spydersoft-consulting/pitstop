import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  fillUpSliceReducer,
  fetchFillUps,
  createFillUp,
  updateFillUp,
  deleteFillUp,
  type FillUp,
} from "./fillUpSlice";

vi.mock("../../api/fillUpsApi", () => ({
  fillUpsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { fillUpsApi } from "../../api/fillUpsApi";

const f = (id: number, overrides: Partial<FillUp> = {}): FillUp =>
  ({
    id,
    vehicleId: 1,
    filledAt: "2026-01-01T00:00:00.000Z",
    odometerReading: 1000 + id,
    gallonsAdded: 10,
    pricePerGallon: 3,
    totalCost: 30,
    isFullFillUp: true,
    fuelGrade: "Regular",
    ...overrides,
  }) as FillUp;

function makeStore() {
  return configureStore({ reducer: { fillUps: fillUpSliceReducer } });
}

describe("fillUpSlice thunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchFillUps populates recentFillUps from the response", async () => {
    vi.mocked(fillUpsApi.list).mockResolvedValue({
      items: [f(1), f(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    const store = makeStore();
    await store.dispatch(fetchFillUps(1));
    const state = store.getState().fillUps;
    expect(state.recentFillUps).toHaveLength(2);
    expect(state.loading).toBe(false);
  });

  it("fetchFillUps handles a missing items list", async () => {
    vi.mocked(fillUpsApi.list).mockResolvedValue({
      items: undefined as unknown as FillUp[],
      totalCount: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    });
    const store = makeStore();
    await store.dispatch(fetchFillUps(1));
    expect(store.getState().fillUps.recentFillUps).toEqual([]);
  });

  it("fetchFillUps.pending clears existing entries and sets loading", () => {
    const action = { type: fetchFillUps.pending.type };
    const next = fillUpSliceReducer(
      { recentFillUps: [f(99)], loading: false },
      action,
    );
    expect(next.loading).toBe(true);
    expect(next.recentFillUps).toEqual([]);
  });

  it("createFillUp.fulfilled inserts the new entry at the front", async () => {
    const store = makeStore();
    vi.mocked(fillUpsApi.list).mockResolvedValue({
      items: [f(1)],
      totalCount: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchFillUps(1));

    vi.mocked(fillUpsApi.create).mockResolvedValue(f(2));
    await store.dispatch(
      createFillUp({
        vehicleId: 1,
        body: {
          filledAt: "2026-02-01",
          odometerReading: 1002,
          gallonsAdded: 10,
          pricePerGallon: 3,
          totalCost: 30,
          isFullFillUp: true,
          fuelGrade: "Regular",
        },
      }),
    );

    const list = store.getState().fillUps.recentFillUps;
    expect(list.map((x) => x.id)).toEqual([2, 1]);
  });

  it("updateFillUp.fulfilled replaces the matching entry", async () => {
    const store = makeStore();
    vi.mocked(fillUpsApi.list).mockResolvedValue({
      items: [f(1, { totalCost: 30 }), f(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchFillUps(1));

    vi.mocked(fillUpsApi.update).mockResolvedValue(f(1, { totalCost: 99 }));
    await store.dispatch(
      updateFillUp({
        vehicleId: 1,
        id: 1,
        body: {
          filledAt: "2026-01-01",
          odometerReading: 1001,
          gallonsAdded: 10,
          pricePerGallon: 9.9,
          totalCost: 99,
          isFullFillUp: true,
          fuelGrade: "Regular",
        },
      }),
    );

    const updated = store.getState().fillUps.recentFillUps.find((x) => x.id === 1);
    expect(updated?.totalCost).toBe(99);
  });

  it("deleteFillUp.fulfilled removes the matching entry", async () => {
    const store = makeStore();
    vi.mocked(fillUpsApi.list).mockResolvedValue({
      items: [f(1), f(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchFillUps(1));

    vi.mocked(fillUpsApi.delete).mockResolvedValue(undefined);
    await store.dispatch(deleteFillUp({ vehicleId: 1, id: 1 }));
    expect(
      store.getState().fillUps.recentFillUps.map((x) => x.id),
    ).toEqual([2]);
  });
});
