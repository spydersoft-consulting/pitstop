import { useEffect, useRef, useState } from "react";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { locationsApi } from "../../api/locationsApi";
import type { LocationDto } from "../../api/generated/types.gen";
import { getAddressLookupProvider, type AddressSuggestion } from "../../services/addressLookup";

export type LocationSelection =
  | { kind: "existing"; id: number; name: string; address: string | null }
  | {
      kind: "new";
      name: string;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      googlePlaceId: string | null;
    }
  | null;

interface Props {
  value: LocationSelection;
  onChange: (next: LocationSelection) => void;
}

const ADD_NEW_TOKEN = "__add-new__";

interface AddNewItem {
  __addNew: true;
  label: string;
}

type SuggestionItem = LocationDto | AddNewItem;

function isAddNew(item: SuggestionItem): item is AddNewItem {
  return (item as AddNewItem).__addNew === true;
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

export const LocationPicker: React.FC<Props> = ({ value, onChange }) => {
  const [query, setQuery] = useState<string>(() => {
    if (value?.kind === "existing") return value.name;
    if (value?.kind === "new") return value.name;
    return "";
  });
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [editing, setEditing] = useState<boolean>(value?.kind === "new");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>({ kind: "idle" });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input text in sync if the parent swaps the value out from underneath us
  // (e.g. clear or external override). Don't fight the user while they're typing — only
  // sync when the picker's reflected name doesn't already match what's typed.
  useEffect(() => {
    const reflected = value?.kind === "existing" || value?.kind === "new" ? value.name : "";
    setQuery((q) => (q === reflected ? q : reflected));
    setEditing(value?.kind === "new");
  }, [value]);

  useEffect(() => {
    const reflected = value?.kind === "new" ? (value.address ?? "") : "";
    setAddressQuery((q) => (q === reflected ? q : reflected));
  }, [value]);

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
    if (value?.kind !== "new") return;
    setAddressQuery(suggestion.description);
    try {
      const details = await getAddressLookupProvider().getDetails(suggestion.id);
      setAddressLookupError(null);
      onChange({
        ...value,
        address: details.formattedAddress,
        latitude: details.latitude,
        longitude: details.longitude,
        googlePlaceId: details.providerPlaceId,
      });
    } catch {
      setAddressLookupError("Couldn't look up that address -- you can still enter it manually below.");
    }
  };

  const search = (event: AutoCompleteCompleteEvent) => {
    const term = (event.query ?? "").trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await locationsApi.list({
          search: term || undefined,
          limit: 10,
          orderBy: "recent",
        });
        const addNew: AddNewItem = {
          __addNew: true,
          label: term ? `+ Add new "${term}"` : "+ Add new location",
        };
        setSuggestions([...items, addNew]);
      } catch {
        // On API failure, still surface the "add new" option
        setSuggestions([{ __addNew: true, label: "+ Add new location" }]);
      }
    }, 250);
  };

  const handleSelect = (item: SuggestionItem) => {
    if (isAddNew(item)) {
      onChange({
        kind: "new",
        name: query.trim(),
        address: null,
        latitude: null,
        longitude: null,
        googlePlaceId: null,
      });
      setEditing(true);
      return;
    }
    onChange({
      kind: "existing",
      id: Number(item.id),
      name: item.name ?? "",
      address: item.address ?? null,
    });
    setEditing(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setEditing(false);
  };

  const itemTemplate = (item: SuggestionItem) => {
    if (isAddNew(item)) {
      return (
        <div className="flex items-center gap-2 text-primary font-medium">
          <i className="pi pi-plus text-xs" />
          <span>{item.label}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        {item.address && <span className="text-xs text-secondary">{item.address}</span>}
      </div>
    );
  };

  const updateNew = <K extends keyof Extract<LocationSelection, { kind: "new" }>>(
    key: K,
    next: Extract<LocationSelection, { kind: "new" }>[K],
  ) => {
    if (value?.kind !== "new") return;
    onChange({ ...value, [key]: next });
  };

  const useBrowserLocation = () => {
    if (value?.kind !== "new") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus(GEO_UNSUPPORTED);
      return;
    }
    setGeoStatus({ kind: "fetching" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Read value via the picker's closure-captured selection. Because state updates
        // are batched, build the next selection in one shot rather than two `updateNew`
        // calls (which would race and the second would clobber the first).
        const next: Extract<LocationSelection, { kind: "new" }> = {
          ...value,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        };
        onChange(next);
        setGeoStatus({ kind: "idle" });
      },
      (err) => setGeoStatus({ kind: "error", message: geoErrorMessage(err) }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-start">
        <AutoComplete
          value={query}
          suggestions={suggestions}
          completeMethod={search}
          field={ADD_NEW_TOKEN /* we render via template */}
          itemTemplate={itemTemplate}
          delay={0}
          dropdown
          forceSelection={false}
          placeholder="Search or add a station"
          inputClassName="w-full"
          className="w-full"
          onChange={(e) => {
            const v = e.value;
            if (typeof v === "string") {
              setQuery(v);
              // Typing while a selection is active means the user is searching again —
              // clear the selection but keep the inline-new editor closed.
              if (value !== null) {
                onChange(null);
                setEditing(false);
              }
            }
          }}
          onSelect={(e) => handleSelect(e.value)}
        />
        {value !== null && (
          <Button
            type="button"
            icon="pi pi-times"
            severity="secondary"
            outlined
            aria-label="Clear location"
            onClick={handleClear}
          />
        )}
      </div>

      {editing && value?.kind === "new" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3 flex flex-col gap-2">
          <div className="text-xs font-medium text-secondary uppercase tracking-wide">New location</div>
          <InputText
            value={value.name}
            onChange={(e) => updateNew("name", e.target.value)}
            placeholder="Name (e.g. Costco Gas)"
            className="w-full"
          />
          <AutoComplete
            value={addressQuery}
            suggestions={addressSuggestions}
            completeMethod={searchAddress}
            field="description"
            delay={0}
            placeholder="Address (optional)"
            inputClassName="w-full"
            className="w-full"
            onChange={(e) => {
              const v = e.value;
              if (typeof v === "string") {
                setAddressQuery(v);
                updateNew("address", v || null);
              }
            }}
            onSelect={(e) => void handleSelectAddress(e.value as AddressSuggestion)}
          />
          {addressLookupError && <span className="text-xs text-red-500">{addressLookupError}</span>}
          <div className="grid grid-cols-2 gap-2">
            <InputNumber
              value={value.latitude}
              onValueChange={(e) => updateNew("latitude", e.value ?? null)}
              placeholder="Latitude (optional)"
              minFractionDigits={4}
              maxFractionDigits={6}
              className="w-full"
              inputClassName="w-full"
            />
            <InputNumber
              value={value.longitude}
              onValueChange={(e) => updateNew("longitude", e.value ?? null)}
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
      )}

      {value?.kind === "existing" && value.address && <div className="text-xs text-secondary">{value.address}</div>}
    </div>
  );
};
