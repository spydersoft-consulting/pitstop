import type { AddressLookupProvider, AddressSuggestion, NormalizedAddress } from "./types";

interface PlacePrediction {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
  };
}

interface AutocompleteResponse {
  suggestions?: PlacePrediction[];
}

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types: string[];
}

interface PlaceDetailsResponse {
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude: number; longitude: number };
}

const findComponent = (components: AddressComponent[], type: string) => components.find((c) => c.types.includes(type));

/**
 * Backed by Google's Places API (New) REST endpoints, called directly from the browser
 * with a referrer-restricted API key -- no Maps JS SDK script tag required.
 * https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 */
export class GooglePlacesProvider implements AddressLookupProvider {
  // Google bills a whole Autocomplete+Details session as a single Place Details call (the
  // Autocomplete keystrokes are free) as long as every request in the session carries the
  // same token. A session ends -- successfully or not -- the moment Details is requested, so
  // the token is cleared after that call regardless of outcome; the next search() then lazily
  // starts a fresh session. https://developers.google.com/maps/documentation/places/web-service/session-pricing
  private sessionToken: string | null = null;

  constructor(private readonly apiKey: string) {}

  async search(query: string): Promise<AddressSuggestion[]> {
    if (!this.apiKey || !query.trim()) return [];

    this.sessionToken ??= crypto.randomUUID();

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
      },
      body: JSON.stringify({ input: query, sessionToken: this.sessionToken }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as AutocompleteResponse;
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({ id: p.placeId, description: p.text?.text ?? p.placeId }));
  }

  async getDetails(suggestionId: string): Promise<NormalizedAddress> {
    const sessionToken = this.sessionToken;
    this.sessionToken = null;

    const url = new URL(`https://places.googleapis.com/v1/places/${suggestionId}`);
    if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "formattedAddress,addressComponents,location",
      },
    });

    if (!response.ok) {
      throw new Error(`Address lookup failed (${response.status})`);
    }

    const data = (await response.json()) as PlaceDetailsResponse;
    const components = data.addressComponents ?? [];
    const streetNumber = findComponent(components, "street_number")?.longText;
    const route = findComponent(components, "route")?.longText;

    return {
      formattedAddress: data.formattedAddress ?? "",
      street: [streetNumber, route].filter(Boolean).join(" ") || null,
      city: findComponent(components, "locality")?.longText ?? null,
      state: findComponent(components, "administrative_area_level_1")?.shortText ?? null,
      postalCode: findComponent(components, "postal_code")?.longText ?? null,
      country: findComponent(components, "country")?.shortText ?? null,
      latitude: data.location?.latitude ?? null,
      longitude: data.location?.longitude ?? null,
      providerPlaceId: suggestionId,
    };
  }
}
