import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { createFillUp } from "../../store/slices/fillUpSlice";
import { FillUpForm } from "./FillUpForm";
import type { CreateFillUpRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

export const AddFillUp: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CreateFillUpRequest) => {
    if (selectedVehicleId == null) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(createFillUp({ vehicleId: selectedVehicleId, body: values })).unwrap();
      navigate("/fill-ups");
    } catch {
      setError("Failed to save fill-up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Log Fill-Up" subtitle={selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined} />
      <Card>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <FillUpForm onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  );
};
