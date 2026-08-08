import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GooglePlacesProvider } from "./googlePlacesProvider";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("GooglePlacesProvider", () => {
  describe("search", () => {
    it("returns an empty list without calling the API when no key is configured", async () => {
      const provider = new GooglePlacesProvider("");
      const results = await provider.search("123 Main St");
      expect(results).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("returns an empty list for a blank query", async () => {
      const provider = new GooglePlacesProvider("test-key");
      const results = await provider.search("   ");
      expect(results).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("maps placePrediction suggestions to id/description pairs", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { placePrediction: { placeId: "abc123", text: { text: "123 Main St, Springfield" } } },
            { placePrediction: { placeId: "def456", text: { text: "456 Main St, Springfield" } } },
          ],
        }),
      } as Response);

      const provider = new GooglePlacesProvider("test-key");
      const results = await provider.search("Main St");

      expect(results).toEqual([
        { id: "abc123", description: "123 Main St, Springfield" },
        { id: "def456", description: "456 Main St, Springfield" },
      ]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:autocomplete",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-Goog-Api-Key": "test-key" }),
        }),
      );
    });

    it("returns an empty list when the API responds with an error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: false } as Response);

      const provider = new GooglePlacesProvider("test-key");
      const results = await provider.search("Main St");

      expect(results).toEqual([]);
    });
  });

  describe("getDetails", () => {
    it("normalizes address components, including the state as its short (2-letter) form", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
          addressComponents: [
            { longText: "1600", shortText: "1600", types: ["street_number"] },
            { longText: "Amphitheatre Parkway", shortText: "Amphitheatre Pkwy", types: ["route"] },
            { longText: "Mountain View", shortText: "Mountain View", types: ["locality", "political"] },
            { longText: "California", shortText: "CA", types: ["administrative_area_level_1", "political"] },
            { longText: "United States", shortText: "US", types: ["country", "political"] },
            { longText: "94043", shortText: "94043", types: ["postal_code"] },
          ],
          location: { latitude: 37.4224, longitude: -122.0841 },
        }),
      } as Response);

      const provider = new GooglePlacesProvider("test-key");
      const result = await provider.getDetails("abc123");

      expect(result).toEqual({
        formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        street: "1600 Amphitheatre Parkway",
        city: "Mountain View",
        state: "CA",
        postalCode: "94043",
        country: "US",
        latitude: 37.4224,
        longitude: -122.0841,
        providerPlaceId: "abc123",
      });
    });

    it("throws when the API responds with an error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      const provider = new GooglePlacesProvider("test-key");
      await expect(provider.getDetails("missing")).rejects.toThrow("Address lookup failed (404)");
    });
  });

  describe("session tokens", () => {
    const okAutocomplete = (): Response => ({ ok: true, json: async () => ({ suggestions: [] }) }) as Response;
    const okDetails = (): Response =>
      ({ ok: true, json: async () => ({ formattedAddress: "", addressComponents: [] }) }) as Response;

    const bodyOf = (call: unknown[]): { sessionToken?: string } =>
      JSON.parse((call[1] as RequestInit).body as string) as { sessionToken?: string };

    const sessionTokenParamOf = (call: unknown[]): string | null =>
      new URL(call[0] as string | URL).searchParams.get("sessionToken");

    it("generates a session token on the first search and reuses it across further keystrokes", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(okAutocomplete());

      const provider = new GooglePlacesProvider("test-key");
      await provider.search("123 Main");
      await provider.search("123 Main St");

      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const firstToken = bodyOf(calls[0]).sessionToken;
      const secondToken = bodyOf(calls[1]).sessionToken;

      expect(firstToken).toBeTruthy();
      expect(secondToken).toBe(firstToken);
    });

    it("sends the same session token used during search on the details call, linking them into one billed session", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(okAutocomplete()).mockResolvedValueOnce(okDetails());

      const provider = new GooglePlacesProvider("test-key");
      await provider.search("123 Main St");
      const searchToken = bodyOf(vi.mocked(globalThis.fetch).mock.calls[0]).sessionToken;

      await provider.getDetails("place-1");
      const detailsToken = sessionTokenParamOf(vi.mocked(globalThis.fetch).mock.calls[1]);

      expect(detailsToken).toBe(searchToken);
    });

    it("starts a new session for the next search after a details call completes", async () => {
      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(okAutocomplete())
        .mockResolvedValueOnce(okDetails())
        .mockResolvedValueOnce(okAutocomplete());

      const provider = new GooglePlacesProvider("test-key");
      await provider.search("123 Main St");
      const firstToken = bodyOf(vi.mocked(globalThis.fetch).mock.calls[0]).sessionToken;

      await provider.getDetails("place-1");
      await provider.search("456 Elm St");
      const secondToken = bodyOf(vi.mocked(globalThis.fetch).mock.calls[2]).sessionToken;

      expect(secondToken).toBeTruthy();
      expect(secondToken).not.toBe(firstToken);
    });

    it("omits the sessionToken param on getDetails when called without a prior search", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(okDetails());

      const provider = new GooglePlacesProvider("test-key");
      await provider.getDetails("place-1");

      expect(sessionTokenParamOf(vi.mocked(globalThis.fetch).mock.calls[0])).toBeNull();
    });
  });
});
