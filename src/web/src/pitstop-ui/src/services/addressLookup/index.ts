import { getConfig } from "../../utils/Config";
import { GooglePlacesProvider } from "./googlePlacesProvider";
import { NullAddressLookupProvider } from "./nullProvider";
import type { AddressLookupProvider } from "./types";

let instance: AddressLookupProvider | undefined;

/** Swap providers by setting `address_lookup_provider` in config.js -- extend the branch here per provider. */
export function getAddressLookupProvider(): AddressLookupProvider {
  if (!instance) {
    if (getConfig("address_lookup_provider") === "google") {
      instance = new GooglePlacesProvider(getConfig("google_places_api_key"));
    } else {
      instance = new NullAddressLookupProvider();
    }
  }
  return instance;
}

export type { AddressLookupProvider, AddressSuggestion, NormalizedAddress } from "./types";
