import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationPicker, type LocationSelection } from "./LocationPicker";

vi.mock("../../api/locationsApi", () => ({
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

const mockSearch = vi.fn();
const mockGetDetails = vi.fn();
vi.mock("../../services/addressLookup", () => ({
  getAddressLookupProvider: () => ({ search: mockSearch, getDetails: mockGetDetails }),
}));

function newLocation(overrides: Partial<Extract<LocationSelection, { kind: "new" }>> = {}): LocationSelection {
  return {
    kind: "new",
    name: "Costco",
    address: null,
    latitude: null,
    longitude: null,
    googlePlaceId: null,
    ...overrides,
  };
}

describe("LocationPicker — address lookup", () => {
  afterEach(() => {
    mockSearch.mockReset();
    mockGetDetails.mockReset();
  });

  it("populates address, coordinates, and the place id from the selected suggestion", async () => {
    mockSearch.mockResolvedValue([{ id: "place-1", description: "123 Main St, Springfield" }]);
    mockGetDetails.mockResolvedValue({
      formattedAddress: "123 Main St, Springfield, IL 62701, USA",
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
      latitude: 39.78,
      longitude: -89.65,
      providerPlaceId: "place-1",
    });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={newLocation()} onChange={onChange} />);

    const addressInput = screen.getByPlaceholderText(/address \(optional\)/i);
    await user.type(addressInput, "123 Main");

    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith("123 Main"));
    await user.click(await screen.findByText("123 Main St, Springfield"));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "123 Main St, Springfield, IL 62701, USA",
          latitude: 39.78,
          longitude: -89.65,
          googlePlaceId: "place-1",
        }),
      ),
    );
  });

  it("shows a fallback message and leaves manual entry available when the details lookup fails", async () => {
    mockSearch.mockResolvedValue([{ id: "place-1", description: "123 Main St, Springfield" }]);
    mockGetDetails.mockRejectedValue(new Error("boom"));

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={newLocation()} onChange={onChange} />);

    const addressInput = screen.getByPlaceholderText(/address \(optional\)/i);
    await user.type(addressInput, "123 Main");
    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
    await user.click(await screen.findByText("123 Main St, Springfield"));

    expect(await screen.findByText(/couldn't look up that address/i)).toBeInTheDocument();
  });
});

describe("LocationPicker — geolocation", () => {
  const originalGeolocation = Object.getOwnPropertyDescriptor(Navigator.prototype, "geolocation");

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(Navigator.prototype, "geolocation", originalGeolocation);
    } else {
      // jsdom: navigator.geolocation is undefined out of the box; reset by deleting.
      delete (navigator as unknown as { geolocation?: unknown }).geolocation;
    }
  });

  function stubGeolocation(stub: Partial<Geolocation>) {
    Object.defineProperty(Navigator.prototype, "geolocation", {
      configurable: true,
      value: stub,
    });
  }

  it("fills latitude and longitude from getCurrentPosition on success", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: {
          latitude: 47.530123456,
          longitude: -122.032678901,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      }),
    );
    stubGeolocation({ getCurrentPosition });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={newLocation()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /use current location/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Extract<LocationSelection, { kind: "new" }>;
    expect(next.latitude).toBe(47.530123);
    expect(next.longitude).toBe(-122.032679);
  });

  it("surfaces an error message when permission is denied", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({
        code: 1,
        message: "User denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });
    stubGeolocation({ getCurrentPosition });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={newLocation()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /use current location/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(await screen.findByText(/location permission was denied/i)).toBeInTheDocument();
  });

  it("falls back gracefully when the browser doesn't support geolocation", async () => {
    // jsdom may define `geolocation` on Navigator.prototype. Force-resolve to undefined
    // on the prototype so the picker's `!navigator.geolocation` check trips.
    Object.defineProperty(Navigator.prototype, "geolocation", {
      configurable: true,
      value: undefined,
    });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={newLocation()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /use current location/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(await screen.findByText(/geolocation isn't available/i)).toBeInTheDocument();
  });

  it("does not show the button when no location is selected", () => {
    const onChange = vi.fn();
    render(<LocationPicker value={null} onChange={onChange} />);

    expect(screen.queryByRole("button", { name: /use current location/i })).toBeNull();
  });

  it("does not show the button for an existing-location selection", () => {
    const onChange = vi.fn();
    render(<LocationPicker value={{ kind: "existing", id: 1, name: "Costco", address: null }} onChange={onChange} />);

    expect(screen.queryByRole("button", { name: /use current location/i })).toBeNull();
  });
});
