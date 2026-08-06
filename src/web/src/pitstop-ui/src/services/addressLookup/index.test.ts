import { describe, it, expect, afterEach, vi } from "vitest";
import { getAddressLookupProvider } from "./index";

afterEach(() => {
  globalThis.__config = undefined;
  vi.resetModules();
});

describe("getAddressLookupProvider", () => {
  it("returns a NullAddressLookupProvider when no provider is configured", async () => {
    vi.resetModules();
    const [{ getAddressLookupProvider: freshGet }, { NullAddressLookupProvider }] = await Promise.all([
      import("./index"),
      import("./nullProvider"),
    ]);
    expect(freshGet()).toBeInstanceOf(NullAddressLookupProvider);
  });

  it("returns a GooglePlacesProvider when configured for google", async () => {
    globalThis.__config = { address_lookup_provider: "google", google_places_api_key: "test-key" };
    vi.resetModules();
    const [{ getAddressLookupProvider: freshGet }, { GooglePlacesProvider }] = await Promise.all([
      import("./index"),
      import("./googlePlacesProvider"),
    ]);
    expect(freshGet()).toBeInstanceOf(GooglePlacesProvider);
  });

  it("memoizes the provider instance across calls", () => {
    expect(getAddressLookupProvider()).toBe(getAddressLookupProvider());
  });
});
