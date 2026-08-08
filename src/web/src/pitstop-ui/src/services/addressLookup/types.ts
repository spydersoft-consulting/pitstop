export interface AddressSuggestion {
  id: string;
  description: string;
}

export interface NormalizedAddress {
  formattedAddress: string;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  providerPlaceId: string;
}

export interface AddressLookupProvider {
  search(query: string): Promise<AddressSuggestion[]>;
  getDetails(suggestionId: string): Promise<NormalizedAddress>;
}
