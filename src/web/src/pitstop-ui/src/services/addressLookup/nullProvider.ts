import type { AddressLookupProvider, AddressSuggestion, NormalizedAddress } from "./types";

/** No-op fallback when no address lookup provider is configured -- callers fall back to manual entry. */
export class NullAddressLookupProvider implements AddressLookupProvider {
  search(): Promise<AddressSuggestion[]> {
    return Promise.resolve([]);
  }

  getDetails(): Promise<NormalizedAddress> {
    return Promise.reject(new Error("No address lookup provider is configured."));
  }
}
