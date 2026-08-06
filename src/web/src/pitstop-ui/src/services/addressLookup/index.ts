import { getConfig } from "../../utils/Config";
import { GooglePlacesProvider } from "./googlePlacesProvider";
import { NullAddressLookupProvider } from "./nullProvider";
import type { AddressLookupProvider } from "./types";

let instance: AddressLookupProvider | undefined;

/** Swap providers by setting `address_lookup_provider` in config.js -- add a case here per provider. */
export function getAddressLookupProvider(): AddressLookupProvider {
  if (!instance) {
    switch (getConfig("address_lookup_provider")) {
      case "google":
        instance = new GooglePlacesProvider(getConfig("google_places_api_key"));
        break;
      default:
        instance = new NullAddressLookupProvider();
    }
  }
  return instance;
}

export type { AddressLookupProvider, AddressSuggestion, NormalizedAddress } from "./types";
