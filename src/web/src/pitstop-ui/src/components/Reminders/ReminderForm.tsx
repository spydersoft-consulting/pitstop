import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import type { ReminderRequest } from "../../api/generated/types.gen";
import type { ReminderTemplate } from "../../store/slices/reminderSlice";
import { SERVICE_TYPE_OPTIONS } from "../MaintenanceLog/maintenanceLogOptions";

export interface ReminderFormValues {
  serviceType: string;
  name: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  leadMiles: number | null;
  leadDays: number | null;
  isActive: boolean;
}

const emptyReminderValues = (): ReminderFormValues => ({
  serviceType: "OilChange",
  name: "",
  intervalMiles: null,
  intervalMonths: null,
  leadMiles: null,
  leadDays: null,
  isActive: true,
});

interface Props {
  initialValues?: ReminderFormValues;
  templates?: ReminderTemplate[];
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (body: ReminderRequest) => void;
}

const numOrNull = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export const ReminderForm: React.FC<Props> = ({
  initialValues = emptyReminderValues(),
  templates = [],
  isEdit = false,
  submitting = false,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<ReminderFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ReminderFormValues>(key: K, value: ReminderFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const template = isEdit ? undefined : templates.find((t) => t.serviceType === serviceType);
    setValues((prev) => ({
      ...prev,
      serviceType,
      ...(template && {
        intervalMiles: numOrNull(template.intervalMiles),
        intervalMonths: numOrNull(template.intervalMonths),
        leadMiles: numOrNull(template.leadMiles),
        leadDays: numOrNull(template.leadDays),
      }),
    }));
    setError(null);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!values.intervalMiles && !values.intervalMonths) {
      setError("Set an interval in miles, months, or both.");
      return;
    }
    onSubmit({
      serviceType: values.serviceType,
      name: values.name.trim() || null,
      intervalMiles: values.intervalMiles || null,
      intervalMonths: values.intervalMonths || null,
      leadMiles: values.leadMiles,
      leadDays: values.leadDays,
      isActive: values.isActive,
    });
  };

  const field = (label: string, id: string, children: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-secondary">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          "Service type",
          "reminder-service-type",
          <Dropdown
            inputId="reminder-service-type"
            value={values.serviceType}
            options={SERVICE_TYPE_OPTIONS}
            onChange={(e) => handleServiceTypeChange(e.value)}
            className="w-full"
          />,
        )}
        {field(
          "Name",
          "reminder-name",
          <InputText
            id="reminder-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Defaults to the service type"
            maxLength={100}
            className="w-full"
          />,
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field(
          "Repeat every (miles)",
          "reminder-interval-miles",
          <InputNumber
            inputId="reminder-interval-miles"
            value={values.intervalMiles}
            onValueChange={(e) => set("intervalMiles", e.value ?? null)}
            min={0}
            useGrouping
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Repeat every (months)",
          "reminder-interval-months",
          <InputNumber
            inputId="reminder-interval-months"
            value={values.intervalMonths}
            onValueChange={(e) => set("intervalMonths", e.value ?? null)}
            min={0}
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Notify this many miles ahead",
          "reminder-lead-miles",
          <InputNumber
            inputId="reminder-lead-miles"
            value={values.leadMiles}
            onValueChange={(e) => set("leadMiles", e.value ?? null)}
            min={0}
            useGrouping
            className="w-full"
            inputClassName="w-full"
          />,
        )}
        {field(
          "Notify this many days ahead",
          "reminder-lead-days",
          <InputNumber
            inputId="reminder-lead-days"
            value={values.leadDays}
            onValueChange={(e) => set("leadDays", e.value ?? null)}
            min={0}
            className="w-full"
            inputClassName="w-full"
          />,
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          inputId="reminder-active"
          checked={values.isActive}
          onChange={(e) => set("isActive", e.checked ?? false)}
        />
        <label htmlFor="reminder-active" className="text-sm">
          Send notifications for this reminder
        </label>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          label={isEdit ? "Save Changes" : "Add Reminder"}
          loading={submitting}
          className="p-button-sm"
        />
        <Button
          type="button"
          label="Cancel"
          className="p-button-sm p-button-outlined"
          onClick={() => navigate("/reminders")}
        />
      </div>
    </form>
  );
};
