import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { createReminder } from "../../store/slices/reminderSlice";
import type { ReminderRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";
import { ReminderForm } from "./ReminderForm";

export const AddReminder: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const templates = useAppSelector((s) => s.reminders.templates);
  const selectedVehicle = useSelectedVehicle();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (body: ReminderRequest) => {
    if (selectedVehicleId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(createReminder({ vehicleId: selectedVehicleId, body })).unwrap();
      navigate("/reminders");
    } catch {
      setError("Failed to save reminder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Add Reminder" subtitle={selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined} />
      <Card>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <ReminderForm templates={templates} onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  );
};
