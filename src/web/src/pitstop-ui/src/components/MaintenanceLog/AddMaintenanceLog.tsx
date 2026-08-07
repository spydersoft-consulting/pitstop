import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { createMaintenanceLog } from "../../store/slices/maintenanceLogSlice";
import { MaintenanceLogForm } from "./MaintenanceLogForm";
import type { CreateMaintenanceLogRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

export const AddMaintenanceLog: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CreateMaintenanceLogRequest) => {
    if (selectedVehicleId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(createMaintenanceLog({ vehicleId: selectedVehicleId, body: values })).unwrap();
      navigate("/maintenance");
    } catch {
      setError("Failed to save maintenance log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader
        title="Log Maintenance"
        subtitle={selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined}
      />
      <Card>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <MaintenanceLogForm onSubmit={handleSubmit} submitting={submitting} />
        <p className="text-xs text-gray-400 mt-3">Save this entry to attach receipts or photos.</p>
      </Card>
    </div>
  );
};
