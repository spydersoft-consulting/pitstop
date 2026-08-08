import { useEffect, useRef, useState } from "react";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { getAddressLookupProvider, type AddressSuggestion } from "../../services/addressLookup";

export interface AddressFieldsValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId?: string | null;
}

interface Props {
  value: AddressFieldsValue;
  onChange: (next: AddressFieldsValue) => void;
  addressPlaceholder?: string;
  addressInputId?: string;
}

type GeoStatus = { kind: "idle" } | { kind: "fetching" } | { kind: "error"; message: string };

const GEO_UNSUPPORTED: GeoStatus = {
  kind: "error",
  message: "Geolocation isn't available in this browser.",
};

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't determine your location.";
    case err.TIMEOUT:
      return "Location lookup timed out.";
    default:
      return "Location lookup failed.";
  }
}

/**
 * Address autocomplete (backed by the configured AddressLookupProvider) plus manual
 * latitude/longitude fields and a "use current location" fallback. Shared between the
 * inline "new location" editor in LocationPicker and the standalone Locations management page
 * so every place an address is entered gets the same lookup-assisted experience.
 */
export const AddressFields: React.FC<Props> = ({
  value,
  onChange,
  addressPlaceholder = "Address (optional)",
  addressInputId,
}) => {
  const [addressQuery, setAddressQuery] = useState(value.address ?? "");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>({ kind: "idle" });
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input text in sync if the parent swaps the value out from underneath us. Don't
  // fight the user while they're typing -- only sync when the reflected text doesn't match.
  useEffect(() => {
    const reflected = value.address ?? "";
    setAddressQuery((q) => (q === reflected ? q : reflected));
  }, [value.address]);

  const searchAddress = (event: AutoCompleteCompleteEvent) => {
    const term = (event.query ?? "").trim();
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (!term) {
      setAddressSuggestions([]);
      return;
    }
    addressDebounceRef.current = setTimeout(async () => {
      try {
        setAddressSuggestions(await getAddressLookupProvider().search(term));
        setAddressLookupError(null);
      } catch {
        setAddressSuggestions([]);
      }
    }, 250);
  };

  const handleSelectAddress = async (suggestion: AddressSuggestion) => {
    setAddressQuery(suggestion.description);
    try {
      const details = await getAddressLookupProvider().getDetails(suggestion.id);
      setAddressLookupError(null);
      onChange({
        address: details.formattedAddress,
        latitude: details.latitude,
        longitude: details.longitude,
        googlePlaceId: details.providerPlaceId,
      });
    } catch {
      setAddressLookupError("Couldn't look up that address -- you can still enter it manually below.");
    }
  };

  const useBrowserLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus(GEO_UNSUPPORTED);
      return;
    }
    setGeoStatus({ kind: "fetching" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...value,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoStatus({ kind: "idle" });
      },
      (err) => setGeoStatus({ kind: "error", message: geoErrorMessage(err) }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <AutoComplete
        inputId={addressInputId}
        value={addressQuery}
        suggestions={addressSuggestions}
        completeMethod={searchAddress}
        field="description"
        delay={0}
        placeholder={addressPlaceholder}
        inputClassName="w-full"
        className="w-full"
        onChange={(e) => {
          const v = e.value;
          if (typeof v === "string") {
            setAddressQuery(v);
            onChange({ ...value, address: v });
          }
        }}
        onSelect={(e) => void handleSelectAddress(e.value as AddressSuggestion)}
      />
      {addressLookupError && <span className="text-xs text-red-500">{addressLookupError}</span>}
      <div className="grid grid-cols-2 gap-2">
        <InputNumber
          value={value.latitude}
          onValueChange={(e) => onChange({ ...value, latitude: e.value ?? null })}
          placeholder="Latitude (optional)"
          minFractionDigits={4}
          maxFractionDigits={6}
          className="w-full"
          inputClassName="w-full"
        />
        <InputNumber
          value={value.longitude}
          onValueChange={(e) => onChange({ ...value, longitude: e.value ?? null })}
          placeholder="Longitude (optional)"
          minFractionDigits={4}
          maxFractionDigits={6}
          className="w-full"
          inputClassName="w-full"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          icon="pi pi-map-marker"
          label="Use current location"
          size="small"
          outlined
          loading={geoStatus.kind === "fetching"}
          onClick={useBrowserLocation}
        />
        {geoStatus.kind === "error" && <span className="text-xs text-red-500">{geoStatus.message}</span>}
      </div>
    </div>
  );
};
