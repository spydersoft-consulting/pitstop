import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { loadState, saveState } from "./localStorage";
import { vehicleSliceReducer } from "./slices/vehicleSlice";
import { fillUpSliceReducer } from "./slices/fillUpSlice";
import { locationSliceReducer } from "./slices/locationSlice";
import { maintenanceLogSliceReducer } from "./slices/maintenanceLogSlice";
import { notificationSliceReducer } from "./slices/notificationSlice";

const rootReducer = combineReducers({
  vehicles: vehicleSliceReducer,
  fillUps: fillUpSliceReducer,
  locations: locationSliceReducer,
  maintenanceLogs: maintenanceLogSliceReducer,
  notifications: notificationSliceReducer,
});

// Defined from rootReducer (not store.getState) to avoid circular type reference with localStorage
export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadState(),
});

store.subscribe(() => {
  saveState(store.getState());
});

export type AppDispatch = typeof store.dispatch;
