import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { updateReminder } from "../../store/slices/reminderSlice";
import type { ReminderRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";
import { ReminderForm, type ReminderFormValues } from "./ReminderForm";
import { num } from "./reminderFormat";

export const EditReminder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const vehicleLabel = selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined;
  const reminder = useAppSelector((s) => s.reminders.reminders.find((r) => String(r.id) === id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reminder || selectedVehicleId == null) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeader title="Edit Reminder" subtitle={vehicleLabel} />
        <p className="text-content-muted">Reminder not found.</p>
      </div>
    );
  }

  const initialValues: ReminderFormValues = {
    serviceType: reminder.serviceType ?? "OilChange",
    name: reminder.name ?? "",
    intervalMiles: num(reminder.intervalMiles),
    intervalMonths: num(reminder.intervalMonths),
    leadMiles: num(reminder.leadMiles),
    leadDays: num(reminder.leadDays),
    isActive: reminder.isActive ?? true,
  };

  const handleSubmit = async (body: ReminderRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(updateReminder({ vehicleId: selectedVehicleId, id: Number(reminder.id), body })).unwrap();
      navigate("/reminders");
    } catch {
      setError("Failed to update reminder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Edit Reminder" subtitle={vehicleLabel} />
      <Card>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <ReminderForm initialValues={initialValues} isEdit onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  );
};
