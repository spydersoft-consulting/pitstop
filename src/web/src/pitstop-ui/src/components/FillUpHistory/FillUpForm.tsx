import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { CreateFillUpRequest, FillUpRequest } from "../../api/generated/types.gen";
import { LocationPicker, type LocationSelection } from "../Locations/LocationPicker";

const FUEL_GRADE_OPTIONS = [
  { label: "Regular", value: "Regular" },
  { label: "Mid-Grade", value: "MidGrade" },
  { label: "Premium", value: "Premium" },
  { label: "Diesel", value: "Diesel" },
  { label: "E85", value: "E85" },
];

export interface FillUpFormValues {
  filledAt: Date | null;
  odometerReading: number | null;
  gallonsAdded: number | null;
  fuelGrade: string;
  pricePerGallon: number | null;
  totalCost: number | null;
  isFullFillUp: boolean;
  location: LocationSelection;
  notes: string;
}

interface Props {
  initialValues?: FillUpFormValues;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: CreateFillUpRequest | FillUpRequest) => void;
}

const defaults: FillUpFormValues = {
  filledAt: new Date(),
  odometerReading: null,
  gallonsAdded: null,
  fuelGrade: "MidGrade",
  pricePerGallon: null,
  totalCost: null,
  isFullFillUp: true,
  location: null,
  notes: "",
};

export const FillUpForm: React.FC<Props> = ({
  initialValues = defaults,
  isEdit = false,
  submitting = false,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<FillUpFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FillUpFormValues, string>>>({});

  const set = <K extends keyof FillUpFormValues>(key: K, value: FillUpFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const autoTotalCost = () => {
    if (values.gallonsAdded != null && values.pricePerGallon != null && values.totalCost == null) {
      set("totalCost", parseFloat((values.gallonsAdded * values.pricePerGallon).toFixed(2)));
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.filledAt) next.filledAt = "Date is required.";
    if (values.odometerReading == null) next.odometerReading = "Odometer reading is required.";
    if (values.gallonsAdded == null) next.gallonsAdded = "Gallons added is required.";
    if (values.pricePerGallon == null) next.pricePerGallon = "Price per gallon is required.";
    if (values.totalCost == null) next.totalCost = "Total cost is required.";
    if (values.location?.kind === "new" && !values.location.name.trim()) {
      next.location = "Location name is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const locationFields = (selection: LocationSelection):
    | Pick<CreateFillUpRequest, "locationId" | "location"> => {
    if (selection === null) return { locationId: null, location: null };
    if (selection.kind === "existing") return { locationId: selection.id, location: null };
    return {
      locationId: null,
      location: {
        name: selection.name.trim(),
        address: selection.address?.trim() || null,
        latitude: selection.latitude,
        longitude: selection.longitude,
        googlePlaceId: selection.googlePlaceId,
      },
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const body: CreateFillUpRequest | FillUpRequest = {
      filledAt: values.filledAt!.toISOString(),
      odometerReading: values.odometerReading!,
      gallonsAdded: values.gallonsAdded!,
      fuelGrade: values.fuelGrade.trim() || "MidGrade",
      pricePerGallon: values.pricePerGallon!,
      totalCost: values.totalCost!,
      isFullFillUp: values.isFullFillUp,
      ...locationFields(values.location),
      notes: values.notes.trim() || null,
    };
    onSubmit(body);
  };

  const field = (label: string, error?: string, children: React.ReactNode = null) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-secondary">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {field("Date *", errors.filledAt,
        <Calendar
          value={values.filledAt}
          onChange={(e) => set("filledAt", e.value ?? null)}
          showIcon
          showTime
          hourFormat="12"
          className="w-full"
          inputClassName="w-full"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("Odometer (mi) *", errors.odometerReading,
          <InputNumber
            value={values.odometerReading}
            onValueChange={(e) => set("odometerReading", e.value ?? null)}
            placeholder="e.g. 45230"
            useGrouping
            className={errors.odometerReading ? "p-invalid w-full" : "w-full"}
            inputClassName="w-full"
          />
        )}
        {field("Fuel Grade",
          undefined,
          <Dropdown
            value={values.fuelGrade}
            options={FUEL_GRADE_OPTIONS}
            onChange={(e) => set("fuelGrade", e.value)}
            className="w-full"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field("Gallons Added *", errors.gallonsAdded,
          <InputNumber
            value={values.gallonsAdded}
            onValueChange={(e) => set("gallonsAdded", e.value ?? null)}
            onBlur={autoTotalCost}
            placeholder="e.g. 12.345"
            minFractionDigits={3}
            maxFractionDigits={3}
            className={errors.gallonsAdded ? "p-invalid w-full" : "w-full"}
            inputClassName="w-full"
          />
        )}
        {field("Price / Gallon *", errors.pricePerGallon,
          <InputNumber
            value={values.pricePerGallon}
            onValueChange={(e) => set("pricePerGallon", e.value ?? null)}
            onBlur={autoTotalCost}
            placeholder="e.g. 3.459"
            mode="currency"
            currency="USD"
            minFractionDigits={3}
            maxFractionDigits={3}
            className={errors.pricePerGallon ? "p-invalid w-full" : "w-full"}
            inputClassName="w-full"
          />
        )}
        {field("Total Cost *", errors.totalCost,
          <InputNumber
            value={values.totalCost}
            onValueChange={(e) => set("totalCost", e.value ?? null)}
            placeholder="e.g. 42.71"
            mode="currency"
            currency="USD"
            minFractionDigits={2}
            maxFractionDigits={2}
            className={errors.totalCost ? "p-invalid w-full" : "w-full"}
            inputClassName="w-full"
          />
        )}
      </div>

      {field("Location", errors.location,
        <LocationPicker
          value={values.location}
          onChange={(loc) => set("location", loc)}
        />
      )}

      {field("Notes",
        undefined,
        <InputTextarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes"
          rows={3}
          autoResize
          className="w-full"
        />
      )}

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          inputId="isFullFillUp"
          checked={values.isFullFillUp}
          onChange={(e) => set("isFullFillUp", e.checked ?? false)}
        />
        <label htmlFor="isFullFillUp" className="text-sm text-secondary">
          Full fill-up (used for MPG calculation)
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          label={isEdit ? "Save Changes" : "Add Fill-Up"}
          loading={submitting}
          className="p-button-sm"
        />
        <Button
          type="button"
          label="Cancel"
          className="p-button-sm p-button-outlined"
          onClick={() => navigate("/fill-ups")}
        />
      </div>
    </form>
  );
};
