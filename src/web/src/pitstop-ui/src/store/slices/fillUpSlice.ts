import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { fillUpsApi } from "../../api/fillUpsApi";
import type { CreateFillUpRequest, FillUpDto, FillUpRequest } from "../../api/generated/types.gen";

export type FillUp = FillUpDto;

interface FillUpState {
  recentFillUps: FillUp[];
  loading: boolean;
}

const initialState: FillUpState = {
  recentFillUps: [],
  loading: false,
};

export const fetchFillUps = createAsyncThunk(
  "fillUps/fetch",
  (vehicleId: number) =>
    fillUpsApi
      .list(vehicleId, { PageSize: 100, Order: "desc" })
      .then((r) => r.items ?? []),
);

export const createFillUp = createAsyncThunk(
  "fillUps/create",
  ({ vehicleId, body }: { vehicleId: number; body: CreateFillUpRequest }) =>
    fillUpsApi.create(vehicleId, body),
);

export const updateFillUp = createAsyncThunk(
  "fillUps/update",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: FillUpRequest }) =>
    fillUpsApi.update(vehicleId, id, body),
);

export const deleteFillUp = createAsyncThunk(
  "fillUps/delete",
  async ({ vehicleId, id }: { vehicleId: number; id: number }) => {
    await fillUpsApi.delete(vehicleId, id);
    return id;
  },
);

const fillUpSlice = createSlice({
  name: "fillUps",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFillUps.pending, (state) => {
        state.loading = true;
        state.recentFillUps = [];
      })
      .addCase(fetchFillUps.fulfilled, (state, action) => {
        state.loading = false;
        state.recentFillUps = action.payload;
      })
      .addCase(fetchFillUps.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createFillUp.fulfilled, (state, action) => {
        state.recentFillUps.unshift(action.payload);
      })
      .addCase(updateFillUp.fulfilled, (state, action) => {
        const idx = state.recentFillUps.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.recentFillUps[idx] = action.payload;
      })
      .addCase(deleteFillUp.fulfilled, (state, action) => {
        state.recentFillUps = state.recentFillUps.filter((f) => f.id !== action.payload);
      });
  },
});

export const fillUpSliceReducer = fillUpSlice.reducer;
