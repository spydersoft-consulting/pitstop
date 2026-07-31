import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";
import type {
  CreateMaintenanceLogRequest,
  MaintenanceLogDto,
  UpdateMaintenanceLogRequest,
} from "../../api/generated/types.gen";

export type MaintenanceLog = MaintenanceLogDto;

interface MaintenanceLogState {
  recentMaintenanceLogs: MaintenanceLog[];
  loading: boolean;
}

const initialState: MaintenanceLogState = {
  recentMaintenanceLogs: [],
  loading: false,
};

export const fetchMaintenanceLogs = createAsyncThunk("maintenanceLogs/fetch", (vehicleId: number) =>
  maintenanceLogsApi.list(vehicleId, { PageSize: 100, Order: "desc" }).then((r) => r.items ?? []),
);

export const createMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/create",
  ({ vehicleId, body }: { vehicleId: number; body: CreateMaintenanceLogRequest }) =>
    maintenanceLogsApi.create(vehicleId, body),
);

export const updateMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/update",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: UpdateMaintenanceLogRequest }) =>
    maintenanceLogsApi.update(vehicleId, id, body),
);

export const deleteMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/delete",
  async ({ vehicleId, id }: { vehicleId: number; id: number }) => {
    await maintenanceLogsApi.delete(vehicleId, id);
    return id;
  },
);

const maintenanceLogSlice = createSlice({
  name: "maintenanceLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaintenanceLogs.pending, (state) => {
        state.loading = true;
        state.recentMaintenanceLogs = [];
      })
      .addCase(fetchMaintenanceLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.recentMaintenanceLogs = action.payload;
      })
      .addCase(fetchMaintenanceLogs.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createMaintenanceLog.fulfilled, (state, action) => {
        state.recentMaintenanceLogs.unshift(action.payload);
      })
      .addCase(updateMaintenanceLog.fulfilled, (state, action) => {
        const idx = state.recentMaintenanceLogs.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.recentMaintenanceLogs[idx] = action.payload;
      })
      .addCase(deleteMaintenanceLog.fulfilled, (state, action) => {
        state.recentMaintenanceLogs = state.recentMaintenanceLogs.filter((f) => f.id !== action.payload);
      });
  },
});

export const maintenanceLogSliceReducer = maintenanceLogSlice.reducer;
