import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { locationsApi, type UpdateLocationRequest } from "../../api/locationsApi";
import type { CreateLocationRequest, LocationDto } from "../../api/generated/types.gen";

export type Location = LocationDto;

interface LocationState {
  locations: Location[];
  loading: boolean;
}

const initialState: LocationState = {
  locations: [],
  loading: false,
};

export const fetchLocations = createAsyncThunk("locations/fetch", async () => {
  return locationsApi.list({ limit: 50, orderBy: "name" });
});

export const createLocation = createAsyncThunk(
  "locations/create",
  async (body: CreateLocationRequest) => {
    return locationsApi.create(body);
  },
);

export const updateLocation = createAsyncThunk(
  "locations/update",
  async ({ id, body }: { id: number; body: UpdateLocationRequest }) => {
    return locationsApi.update(id, body);
  },
);

export const deleteLocation = createAsyncThunk(
  "locations/delete",
  async (id: number) => {
    await locationsApi.delete(id);
    return id;
  },
);

const locationSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {
    upsertLocation(state, action: PayloadAction<Location>) {
      const idx = state.locations.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) {
        state.locations[idx] = action.payload;
      } else {
        state.locations.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.locations.push(action.payload);
        state.locations.sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? ""),
        );
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        const idx = state.locations.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.locations[idx] = action.payload;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.locations = state.locations.filter((l) => l.id !== action.payload);
      });
  },
});

export const { upsertLocation } = locationSlice.actions;
export const locationSliceReducer = locationSlice.reducer;
