import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { CreateMaintenanceLogRequest, UpdateMaintenanceLogRequest } from "../../api/generated/types.gen";
import { LocationPicker, type LocationSelection } from "../Locations/LocationPicker";
import { SERVICE_TYPE_OPTIONS, PERFORMED_BY_OPTIONS } from "./maintenanceLogOptions";

const toDateOnlyString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export interface MaintenanceLogFormValues {
  serviceDate: Date | null;
  odometerReading: number | null;
  serviceType: string;
  description: string;
  performedBy: string;
  isWarrantyWork: boolean;
  location: LocationSelection;
  partsCost: number | null;
  laborCost: number | null;
  totalCost: number | null;
  notes: string;
}

interface Props {
  initialValues?: MaintenanceLogFormValues;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: CreateMaintenanceLogRequest | UpdateMaintenanceLogRequest) => void;
}

const defaults: MaintenanceLogFormValues = {
  serviceDate: new Date(),
  odometerReading: null,
  serviceType: "OilChange",
  description: "",
  performedBy: "Self",
  isWarrantyWork: false,
  location: null,
  partsCost: null,
  laborCost: null,
  totalCost: null,
  notes: "",
};

export const MaintenanceLogForm: React.FC<Props> = ({
  initialValues = defaults,
  isEdit = false,
  submitting = false,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<MaintenanceLogFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof MaintenanceLogFormValues, string>>>({});

  const set = <K extends keyof MaintenanceLogFormValues>(key: K, value: MaintenanceLogFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.serviceDate) next.serviceDate = "Service date is required.";
    if (values.odometerReading == null) next.odometerReading = "Odometer reading is required.";
    if (values.location?.kind === "new" && !values.location.name.trim()) {
      next.location = "Location name is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const locationFields = (
    selection: LocationSelection,
  ): Pick<CreateMaintenanceLogRequest, "locationId" | "location"> => {
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

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const body: CreateMaintenanceLogRequest | UpdateMaintenanceLogRequest = {
      serviceDate: toDateOnlyString(values.serviceDate!),
      odometerReading: values.odometerReading!,
      serviceType: values.serviceType,
      description: values.description.trim() || null,
      performedBy: values.performedBy,
      isWarrantyWork: values.isWarrantyWork,
      ...locationFields(values.location),
      partsCost: values.partsCost,
      laborCost: values.laborCost,
      totalCost: values.totalCost,
      notes: values.notes.trim() || null,
    };
    onSubmit(body);
  };

  const field = (label: string, testId: string, error?: string, children: React.ReactNode = null) => (
    <div className="flex flex-col gap-1" data-testid={testId}>
      <label className="text-sm font-medium text-secondary">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          "Service Date *",
          "service-date",
          errors.serviceDate,
          <Calendar
            value={values.serviceDate}
            onChange={(e) => set("serviceDate", e.value ?? null)}
            showIcon
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Odometer (mi) *",
          "odometer-reading",
          errors.odometerReading,
          <InputNumber
            value={values.odometerReading}
            onValueChange={(e) => set("odometerReading", e.value ?? null)}
            placeholder="e.g. 45230"
            useGrouping
            className={errors.odometerReading ? "p-invalid w-full" : "w-full"}
            inputClassName="w-full"
          />,
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          "Service Type",
          "service-type",
          undefined,
          <Dropdown
            value={values.serviceType}
            options={SERVICE_TYPE_OPTIONS}
            onChange={(e) => set("serviceType", e.value)}
            className="w-full"
          />,
        )}
        {field(
          "Performed By",
          "performed-by",
          undefined,
          <Dropdown
            value={values.performedBy}
            options={PERFORMED_BY_OPTIONS}
            onChange={(e) => set("performedBy", e.value)}
            className="w-full"
          />,
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          inputId="isWarrantyWork"
          checked={values.isWarrantyWork}
          onChange={(e) => set("isWarrantyWork", e.checked ?? false)}
        />
        <label htmlFor="isWarrantyWork" className="text-sm text-secondary">
          Covered under warranty
        </label>
      </div>

      {field(
        "Description",
        "description",
        undefined,
        <InputTextarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional description"
          rows={2}
          autoResize
          className="w-full"
        />,
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field(
          "Parts Cost",
          "parts-cost",
          undefined,
          <InputNumber
            value={values.partsCost}
            onValueChange={(e) => set("partsCost", e.value ?? null)}
            placeholder="e.g. 45.00"
            mode="currency"
            currency="USD"
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Labor Cost",
          "labor-cost",
          undefined,
          <InputNumber
            value={values.laborCost}
            onValueChange={(e) => set("laborCost", e.value ?? null)}
            placeholder="e.g. 60.00"
            mode="currency"
            currency="USD"
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Total Cost",
          "total-cost",
          undefined,
          <InputNumber
            value={values.totalCost}
            onValueChange={(e) => set("totalCost", e.value ?? null)}
            placeholder="Leave blank to sum parts + labor"
            mode="currency"
            currency="USD"
            className="w-full"
            inputClassName="w-full"
          />,
        )}
      </div>

      {field(
        "Location",
        "location",
        errors.location,
        <LocationPicker value={values.location} onChange={(loc) => set("location", loc)} />,
      )}

      {field(
        "Notes",
        "notes",
        undefined,
        <InputTextarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes"
          rows={3}
          autoResize
          className="w-full"
        />,
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          label={isEdit ? "Save Changes" : "Add Maintenance Log"}
          loading={submitting}
          className="p-button-sm"
        />
        <Button
          type="button"
          label="Cancel"
          className="p-button-sm p-button-outlined"
          onClick={() => navigate("/maintenance")}
        />
      </div>
    </form>
  );
};
