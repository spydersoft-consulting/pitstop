import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { CreateVehicleRequest, UpdateVehicleRequest } from "../../api/generated/types.gen";
import { US_STATE_OPTIONS } from "./vehicleOptions";

export interface VehicleFormValues {
  name: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  tankCapacityGallons: number | null;
  initialOdometer: number | null;
  startDate: Date | null;
  plateState: string;
  plateNumber: string;
}

interface Props {
  initialValues?: VehicleFormValues;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: CreateVehicleRequest | UpdateVehicleRequest) => void;
}

const defaults: VehicleFormValues = {
  name: "",
  year: null,
  make: "",
  model: "",
  trim: "",
  tankCapacityGallons: null,
  initialOdometer: null,
  startDate: null,
  plateState: "",
  plateNumber: "",
};

export const VehicleForm: React.FC<Props> = ({
  initialValues = defaults,
  isEdit = false,
  submitting = false,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<VehicleFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormValues, string>>>({});

  const set = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.make.trim()) next.make = "Make is required.";
    if (!values.model.trim()) next.model = "Model is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit) {
      const body: UpdateVehicleRequest = {
        name: values.name.trim(),
        year: values.year ?? undefined,
        make: values.make.trim(),
        model: values.model.trim(),
        trim: values.trim.trim() || null,
        tankCapacityGallons: values.tankCapacityGallons ?? null,
        plateState: values.plateState || null,
        plateNumber: values.plateNumber.trim() || null,
      };
      onSubmit(body);
    } else {
      const body: CreateVehicleRequest = {
        name: values.name.trim(),
        year: values.year ?? undefined,
        make: values.make.trim(),
        model: values.model.trim(),
        trim: values.trim.trim() || null,
        tankCapacityGallons: values.tankCapacityGallons ?? null,
        initialOdometer: values.initialOdometer ?? undefined,
        startDate: values.startDate ? values.startDate.toISOString().split("T")[0] : undefined,
        plateState: values.plateState || null,
        plateNumber: values.plateNumber.trim() || null,
      };
      onSubmit(body);
    }
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
      {field(
        "Name *",
        errors.name,
        <InputText
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. My Daily Driver"
          className={errors.name ? "p-invalid w-full" : "w-full"}
        />,
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          "Make *",
          errors.make,
          <InputText
            value={values.make}
            onChange={(e) => set("make", e.target.value)}
            placeholder="e.g. Honda"
            className={errors.make ? "p-invalid w-full" : "w-full"}
          />,
        )}
        {field(
          "Model *",
          errors.model,
          <InputText
            value={values.model}
            onChange={(e) => set("model", e.target.value)}
            placeholder="e.g. Accord"
            className={errors.model ? "p-invalid w-full" : "w-full"}
          />,
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field(
          "Year",
          undefined,
          <InputNumber
            value={values.year}
            onValueChange={(e) => set("year", e.value ?? null)}
            placeholder="e.g. 2022"
            useGrouping={false}
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Trim",
          undefined,
          <InputText
            value={values.trim}
            onChange={(e) => set("trim", e.target.value)}
            placeholder="e.g. Sport"
            className="w-full"
          />,
        )}
        {field(
          "Tank Capacity (gal)",
          undefined,
          <InputNumber
            value={values.tankCapacityGallons}
            onValueChange={(e) => set("tankCapacityGallons", e.value ?? null)}
            placeholder="e.g. 14.8"
            minFractionDigits={1}
            maxFractionDigits={3}
            className="w-full"
            inputClassName="w-full"
          />,
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field(
          "Plate State",
          undefined,
          <Dropdown
            value={values.plateState || null}
            options={US_STATE_OPTIONS}
            onChange={(e) => set("plateState", e.value ?? "")}
            placeholder="Select state"
            showClear
            className="w-full"
          />,
        )}
        {field(
          "Plate Number",
          undefined,
          <InputText
            value={values.plateNumber}
            onChange={(e) => set("plateNumber", e.target.value)}
            placeholder="e.g. 8ABC123"
            className="w-full"
          />,
        )}
      </div>

      {!isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field(
            "Starting Odometer (mi)",
            undefined,
            <InputNumber
              value={values.initialOdometer}
              onValueChange={(e) => set("initialOdometer", e.value ?? null)}
              placeholder="e.g. 0"
              useGrouping={false}
              className="w-full"
              inputClassName="w-full"
            />,
          )}
          {field(
            "Start Date",
            undefined,
            <Calendar
              value={values.startDate}
              onChange={(e) => set("startDate", e.value ?? null)}
              placeholder="Select date"
              showIcon
              className="w-full"
              inputClassName="w-full"
            />,
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          label={isEdit ? "Save Changes" : "Add Vehicle"}
          loading={submitting}
          className="p-button-sm"
        />
        <Button
          type="button"
          label="Cancel"
          className="p-button-sm p-button-outlined"
          onClick={() => navigate("/vehicles")}
        />
      </div>
    </form>
  );
};
