import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { updateFillUp } from "../../store/slices/fillUpSlice";
import { FillUpForm, type FillUpFormValues } from "./FillUpForm";
import type { FillUpRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

export const EditFillUp: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const vehicleLabel = selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined;
  const fillUp = useAppSelector((s) => s.fillUps.recentFillUps.find((f) => String(f.id) === id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fillUp || selectedVehicleId == null) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeader title="Edit Fill-Up" subtitle={vehicleLabel} />
        <p className="text-gray-400">Fill-up not found.</p>
      </div>
    );
  }

  const initialValues: FillUpFormValues = {
    filledAt: fillUp.filledAt ? new Date(fillUp.filledAt) : null,
    odometerReading: Number(fillUp.odometerReading) || null,
    gallonsAdded: Number(fillUp.gallonsAdded) || null,
    fuelGrade: fillUp.fuelGrade ?? "MidGrade",
    pricePerGallon: Number(fillUp.pricePerGallon) || null,
    totalCost: Number(fillUp.totalCost) || null,
    isFullFillUp: fillUp.isFullFillUp ?? true,
    location: fillUp.location
      ? {
          kind: "existing",
          id: Number(fillUp.location.id),
          name: fillUp.location.name ?? "",
          address: fillUp.location.address ?? null,
        }
      : null,
    notes: fillUp.notes ?? "",
  };

  const handleSubmit = async (values: FillUpRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(updateFillUp({ vehicleId: selectedVehicleId, id: Number(fillUp.id), body: values })).unwrap();
      navigate("/fill-ups");
    } catch {
      setError("Failed to update fill-up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Edit Fill-Up" subtitle={vehicleLabel} />
      <Card>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <FillUpForm initialValues={initialValues} isEdit onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  );
};
