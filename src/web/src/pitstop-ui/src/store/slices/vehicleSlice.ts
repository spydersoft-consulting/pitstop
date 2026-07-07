import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { vehiclesApi } from "../../api/vehiclesApi";
import type { CreateVehicleRequest, UpdateVehicleRequest, VehicleDto } from "../../api/generated/types.gen";

export type Vehicle = VehicleDto;

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  loading: boolean;
}

const initialState: VehicleState = {
  vehicles: [],
  selectedVehicleId: null,
  loading: false,
};

export const fetchVehicles = createAsyncThunk("vehicles/fetch", async () => {
  return vehiclesApi.list();
});

export const createVehicle = createAsyncThunk(
  "vehicles/create",
  async (body: CreateVehicleRequest) => {
    return vehiclesApi.create(body);
  }
);

export const updateVehicle = createAsyncThunk(
  "vehicles/update",
  async ({ id, body }: { id: number; body: UpdateVehicleRequest }) => {
    return vehiclesApi.update(id, body);
  }
);

export const deleteVehicle = createAsyncThunk(
  "vehicles/delete",
  async (id: number) => {
    await vehiclesApi.delete(id);
    return id;
  }
);

const vehicleSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    setVehicles(state, action: PayloadAction<Vehicle[]>) {
      state.vehicles = action.payload;
      if (state.selectedVehicleId === null && action.payload.length > 0) {
        state.selectedVehicleId = action.payload[0].id as number;
      }
    },
    selectVehicle(state, action: PayloadAction<number>) {
      state.selectedVehicleId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
        if (state.selectedVehicleId === null && action.payload.length > 0) {
          state.selectedVehicleId = action.payload[0].id as number;
        }
      })
      .addCase(fetchVehicles.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.vehicles.push(action.payload);
        state.selectedVehicleId ??= action.payload.id as number;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const idx = state.vehicles.findIndex((v) => v.id === action.payload.id);
        if (idx !== -1) state.vehicles[idx] = action.payload;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => v.id !== action.payload);
        if (state.selectedVehicleId === action.payload) {
          state.selectedVehicleId = state.vehicles[0]?.id as number ?? null;
        }
      });
  },
});

export const { setVehicles, selectVehicle } = vehicleSlice.actions;
export const vehicleSliceReducer = vehicleSlice.reducer;
