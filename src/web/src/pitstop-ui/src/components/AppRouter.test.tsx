import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AppRouter } from "./AppRouter";
import { useAuth } from "../context";
import { vehicleSliceReducer } from "../store/slices/vehicleSlice";
import { fillUpSliceReducer } from "../store/slices/fillUpSlice";
import { locationSliceReducer } from "../store/slices/locationSlice";
import { maintenanceLogSliceReducer } from "../store/slices/maintenanceLogSlice";
import { vehiclesApi } from "../api/vehiclesApi";
import { locationsApi } from "../api/locationsApi";

vi.mock("../context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../context")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("../api/vehiclesApi", () => ({
  vehiclesApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../api/locationsApi", () => ({
  locationsApi: { list: vi.fn().mockResolvedValue([]) },
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderAppRouter() {
  const store = configureStore({
    reducer: {
      vehicles: vehicleSliceReducer,
      fillUps: fillUpSliceReducer,
      locations: locationSliceReducer,
      maintenanceLogs: maintenanceLogSliceReducer,
    },
  });
  return render(
    <Provider store={store}>
      <AppRouter />
    </Provider>,
  );
}

describe("AppRouter", () => {
  it("shows a loading spinner instead of Landing while auth is still resolving", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: vi.fn(),
    });

    renderAppRouter();

    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(document.querySelector(".p-progress-spinner")).not.toBeNull();
    expect(vehiclesApi.list).not.toHaveBeenCalled();
  });

  it("renders Landing once loading finishes and the user is not authenticated", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: vi.fn(),
    });

    renderAppRouter();

    expect(document.querySelector(".p-progress-spinner")).toBeNull();
    expect(vehiclesApi.list).not.toHaveBeenCalled();
  });

  it("renders the authenticated app and fetches vehicle/location data once loading finishes and authenticated", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshAuth: vi.fn(),
    });

    renderAppRouter();

    // The Dashboard (default route) shows its own spinner while vehicles are still
    // loading -- this is distinct from AppRouter's own auth-loading spinner, which
    // is what the previous test in this file covers.
    expect(document.querySelector(".p-progress-spinner")).not.toBeNull();
    await waitFor(() => expect(vehiclesApi.list).toHaveBeenCalled());
    await waitFor(() => expect(locationsApi.list).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector(".p-progress-spinner")).toBeNull());
  });
});
