import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Button } from "../ui/Button";
import type {
  CreateMaintenanceLogRequest,
  MaintenanceLogItemRequest,
  UpdateMaintenanceLogRequest,
} from "../../api/generated/types.gen";
import { LocationPicker, type LocationSelection } from "../Locations/LocationPicker";
import { SERVICE_TYPE_OPTIONS, PERFORMED_BY_OPTIONS, emptyItem } from "./maintenanceLogOptions";

const toDateOnlyString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export interface MaintenanceLogItemFormValues {
  /** Client-only React key for the row; assigned by the form and never sent to the API. */
  uid?: string;
  serviceType: string;
  description: string;
  isWarrantyWork: boolean;
  partsCost: number | null;
  laborCost: number | null;
  totalCost: number | null;
}

export interface MaintenanceLogFormValues {
  serviceDate: Date | null;
  odometerReading: number | null;
  performedBy: string;
  location: LocationSelection;
  notes: string;
  items: MaintenanceLogItemFormValues[];
}

const itemCost = (i: MaintenanceLogItemFormValues): number | null => {
  if (i.totalCost != null) return i.totalCost;
  if (i.partsCost == null && i.laborCost == null) return null;
  return (i.partsCost ?? 0) + (i.laborCost ?? 0);
};

const toItemRequest = (i: MaintenanceLogItemFormValues): MaintenanceLogItemRequest => ({
  serviceType: i.serviceType,
  description: i.description.trim() || null,
  isWarrantyWork: i.isWarrantyWork,
  partsCost: i.partsCost,
  laborCost: i.laborCost,
  totalCost: i.totalCost,
});

interface Props {
  initialValues?: MaintenanceLogFormValues;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: CreateMaintenanceLogRequest | UpdateMaintenanceLogRequest) => void;
}

const defaults: MaintenanceLogFormValues = {
  serviceDate: new Date(),
  odometerReading: null,
  performedBy: "Self",
  location: null,
  notes: "",
  items: [emptyItem()],
};

const MAX_ITEMS = 20;

// Service rows have no id until they're saved, and rows can be removed from the middle, so an array
// index would make React reuse the wrong row's input state. Each row gets a stable key instead.
let nextRowKey = 0;
const withRowKey = (item: MaintenanceLogItemFormValues): MaintenanceLogItemFormValues => ({
  ...item,
  uid: item.uid ?? `service-row-${nextRowKey++}`,
});

export const MaintenanceLogForm: React.FC<Props> = ({
  initialValues = defaults,
  isEdit = false,
  submitting = false,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<MaintenanceLogFormValues>(() => ({
    ...initialValues,
    items: initialValues.items.map((item) => withRowKey(item)),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof MaintenanceLogFormValues, string>>>({});

  const set = <K extends keyof MaintenanceLogFormValues>(key: K, value: MaintenanceLogFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setItem = <K extends keyof MaintenanceLogItemFormValues>(
    index: number,
    key: K,
    value: MaintenanceLogItemFormValues[K],
  ) => {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
    setErrors((prev) => ({ ...prev, items: undefined }));
  };

  const addItem = () => setValues((prev) => ({ ...prev, items: [...prev.items, withRowKey(emptyItem())] }));

  const removeItem = (index: number) =>
    setValues((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const visitTotal = values.items.reduce<number | null>((sum, item) => {
    const cost = itemCost(item);
    return cost == null ? sum : (sum ?? 0) + cost;
  }, null);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.serviceDate) next.serviceDate = "Service date is required.";
    if (values.odometerReading == null) next.odometerReading = "Odometer reading is required.";
    if (values.items.length === 0) next.items = "Add at least one service.";
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
      performedBy: values.performedBy,
      ...locationFields(values.location),
      notes: values.notes.trim() || null,
      items: values.items.map(toItemRequest),
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

      <div className="space-y-3" data-testid="service-items">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary">Services performed *</h3>
          {visitTotal != null && (
            <span className="text-sm font-numeric" data-testid="visit-total">
              Visit total: ${visitTotal.toFixed(2)}
            </span>
          )}
        </div>
        {errors.items && <span className="text-xs text-red-500">{errors.items}</span>}

        {values.items.map((item, index) => (
          <div
            key={item.uid}
            className="rounded-xl border border-border p-3 space-y-3"
            data-testid={`service-item-${index}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field(
                "Service Type",
                `service-type-${index}`,
                undefined,
                <Dropdown
                  value={item.serviceType}
                  options={SERVICE_TYPE_OPTIONS}
                  onChange={(e) => setItem(index, "serviceType", e.value)}
                  className="w-full"
                />,
              )}
              {field(
                "Description",
                `description-${index}`,
                undefined,
                <InputText
                  value={item.description}
                  onChange={(e) => setItem(index, "description", e.target.value)}
                  placeholder="Optional description"
                  maxLength={200}
                  className="w-full"
                />,
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {field(
                "Parts Cost",
                `parts-cost-${index}`,
                undefined,
                <InputNumber
                  value={item.partsCost}
                  onValueChange={(e) => setItem(index, "partsCost", e.value ?? null)}
                  placeholder="e.g. 45.00"
                  mode="currency"
                  currency="USD"
                  className="w-full"
                  inputClassName="w-full"
                />,
              )}
              {field(
                "Labor Cost",
                `labor-cost-${index}`,
                undefined,
                <InputNumber
                  value={item.laborCost}
                  onValueChange={(e) => setItem(index, "laborCost", e.value ?? null)}
                  placeholder="e.g. 60.00"
                  mode="currency"
                  currency="USD"
                  className="w-full"
                  inputClassName="w-full"
                />,
              )}
              {field(
                "Total Cost",
                `total-cost-${index}`,
                undefined,
                <InputNumber
                  value={item.totalCost}
                  onValueChange={(e) => setItem(index, "totalCost", e.value ?? null)}
                  placeholder="Blank = parts + labor"
                  mode="currency"
                  currency="USD"
                  className="w-full"
                  inputClassName="w-full"
                />,
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId={`isWarrantyWork-${index}`}
                  checked={item.isWarrantyWork}
                  onChange={(e) => setItem(index, "isWarrantyWork", e.checked ?? false)}
                />
                <label htmlFor={`isWarrantyWork-${index}`} className="text-sm text-secondary">
                  Covered under warranty
                </label>
              </div>
              {values.items.length > 1 && (
                <Button
                  type="button"
                  icon={<FontAwesomeIcon icon={faTrash} />}
                  variant="text"
                  size="sm"
                  severity="danger"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove service ${index + 1}`}
                />
              )}
            </div>
          </div>
        ))}

        {values.items.length < MAX_ITEMS && (
          <Button
            type="button"
            label="Add another service"
            icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
            size="sm"
            variant="outlined"
            onClick={addItem}
          />
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
        <Button type="submit" label={isEdit ? "Save Changes" : "Add Maintenance Log"} loading={submitting} size="sm" />
        <Button type="button" label="Cancel" size="sm" variant="outlined" onClick={() => navigate("/maintenance")} />
      </div>
    </form>
  );
};
