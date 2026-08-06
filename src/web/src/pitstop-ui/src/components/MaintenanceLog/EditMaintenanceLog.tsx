import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { updateMaintenanceLog } from "../../store/slices/maintenanceLogSlice";
import { MaintenanceLogForm, type MaintenanceLogFormValues } from "./MaintenanceLogForm";
import { MaintenanceLogAttachments } from "./MaintenanceLogAttachments";
import type { UpdateMaintenanceLogRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

const parseDateOnly = (s: string | null | undefined): Date | null => (s ? new Date(`${s}T00:00:00`) : null);

export const EditMaintenanceLog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const vehicleLabel = selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined;
  const maintenanceLog = useAppSelector((s) =>
    s.maintenanceLogs.recentMaintenanceLogs.find((f) => String(f.id) === id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!maintenanceLog || selectedVehicleId == null) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeader title="Edit Maintenance Log" subtitle={vehicleLabel} />
        <p className="text-gray-400">Maintenance log not found.</p>
      </div>
    );
  }

  const initialValues: MaintenanceLogFormValues = {
    serviceDate: parseDateOnly(maintenanceLog.serviceDate),
    odometerReading: Number(maintenanceLog.odometerReading) || null,
    serviceType: maintenanceLog.serviceType ?? "OilChange",
    description: maintenanceLog.description ?? "",
    performedBy: maintenanceLog.performedBy ?? "Self",
    isWarrantyWork: maintenanceLog.isWarrantyWork ?? false,
    location: maintenanceLog.location
      ? {
          kind: "existing",
          id: Number(maintenanceLog.location.id),
          name: maintenanceLog.location.name ?? "",
          address: maintenanceLog.location.address ?? null,
        }
      : null,
    partsCost: maintenanceLog.partsCost != null ? Number(maintenanceLog.partsCost) : null,
    laborCost: maintenanceLog.laborCost != null ? Number(maintenanceLog.laborCost) : null,
    totalCost: maintenanceLog.totalCost != null ? Number(maintenanceLog.totalCost) : null,
    notes: maintenanceLog.notes ?? "",
  };

  const handleSubmit = async (values: UpdateMaintenanceLogRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        updateMaintenanceLog({
          vehicleId: selectedVehicleId,
          id: Number(maintenanceLog.id),
          body: values,
        }),
      ).unwrap();
      navigate("/maintenance");
    } catch {
      setError("Failed to update maintenance log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Edit Maintenance Log" subtitle={vehicleLabel} />
      <Card>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <MaintenanceLogForm initialValues={initialValues} isEdit onSubmit={handleSubmit} submitting={submitting} />
      </Card>
      <Card>
        <MaintenanceLogAttachments vehicleId={selectedVehicleId} maintenanceLogId={Number(maintenanceLog.id)} />
      </Card>
    </div>
  );
};
