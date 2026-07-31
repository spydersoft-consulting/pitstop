import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  maintenanceLogSliceReducer,
  fetchMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  type MaintenanceLog,
} from "./maintenanceLogSlice";

vi.mock("../../api/maintenanceLogsApi", () => ({
  maintenanceLogsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";

const m = (id: number, overrides: Partial<MaintenanceLog> = {}): MaintenanceLog =>
  ({
    id,
    vehicleId: 1,
    serviceDate: "2026-01-01",
    odometerReading: 1000 + id,
    serviceType: "OilChange",
    performedBy: "Self",
    partsCost: 20,
    laborCost: 0,
    totalCost: null,
    computedTotalCost: 20,
    ...overrides,
  }) as MaintenanceLog;

function makeStore() {
  return configureStore({ reducer: { maintenanceLogs: maintenanceLogSliceReducer } });
}

describe("maintenanceLogSlice thunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchMaintenanceLogs populates recentMaintenanceLogs from the response", async () => {
    vi.mocked(maintenanceLogsApi.list).mockResolvedValue({
      items: [m(1), m(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    const store = makeStore();
    await store.dispatch(fetchMaintenanceLogs(1));
    const state = store.getState().maintenanceLogs;
    expect(state.recentMaintenanceLogs).toHaveLength(2);
    expect(state.loading).toBe(false);
  });

  it("fetchMaintenanceLogs handles a missing items list", async () => {
    vi.mocked(maintenanceLogsApi.list).mockResolvedValue({
      items: undefined as unknown as MaintenanceLog[],
      totalCount: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    });
    const store = makeStore();
    await store.dispatch(fetchMaintenanceLogs(1));
    expect(store.getState().maintenanceLogs.recentMaintenanceLogs).toEqual([]);
  });

  it("fetchMaintenanceLogs.pending clears existing entries and sets loading", () => {
    const action = { type: fetchMaintenanceLogs.pending.type };
    const next = maintenanceLogSliceReducer({ recentMaintenanceLogs: [m(99)], loading: false }, action);
    expect(next.loading).toBe(true);
    expect(next.recentMaintenanceLogs).toEqual([]);
  });

  it("createMaintenanceLog.fulfilled inserts the new entry at the front", async () => {
    const store = makeStore();
    vi.mocked(maintenanceLogsApi.list).mockResolvedValue({
      items: [m(1)],
      totalCount: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchMaintenanceLogs(1));

    vi.mocked(maintenanceLogsApi.create).mockResolvedValue(m(2));
    await store.dispatch(
      createMaintenanceLog({
        vehicleId: 1,
        body: {
          serviceDate: "2026-02-01",
          odometerReading: 1002,
          serviceType: "TireRotation",
          performedBy: "Shop",
        },
      }),
    );

    const list = store.getState().maintenanceLogs.recentMaintenanceLogs;
    expect(list.map((x) => x.id)).toEqual([2, 1]);
  });

  it("updateMaintenanceLog.fulfilled replaces the matching entry", async () => {
    const store = makeStore();
    vi.mocked(maintenanceLogsApi.list).mockResolvedValue({
      items: [m(1, { totalCost: 30 }), m(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchMaintenanceLogs(1));

    vi.mocked(maintenanceLogsApi.update).mockResolvedValue(m(1, { totalCost: 99 }));
    await store.dispatch(
      updateMaintenanceLog({
        vehicleId: 1,
        id: 1,
        body: {
          serviceDate: "2026-01-01",
          odometerReading: 1001,
          serviceType: "OilChange",
          performedBy: "Self",
          totalCost: 99,
        },
      }),
    );

    const updated = store.getState().maintenanceLogs.recentMaintenanceLogs.find((x) => x.id === 1);
    expect(updated?.totalCost).toBe(99);
  });

  it("deleteMaintenanceLog.fulfilled removes the matching entry", async () => {
    const store = makeStore();
    vi.mocked(maintenanceLogsApi.list).mockResolvedValue({
      items: [m(1), m(2)],
      totalCount: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    await store.dispatch(fetchMaintenanceLogs(1));

    vi.mocked(maintenanceLogsApi.delete).mockResolvedValue(undefined);
    await store.dispatch(deleteMaintenanceLog({ vehicleId: 1, id: 1 }));
    expect(store.getState().maintenanceLogs.recentMaintenanceLogs.map((x) => x.id)).toEqual([2]);
  });
});
