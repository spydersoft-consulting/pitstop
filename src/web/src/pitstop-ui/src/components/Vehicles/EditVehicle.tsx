import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateVehicle } from "../../store/slices/vehicleSlice";
import { VehicleForm, type VehicleFormValues } from "./VehicleForm";
import type { UpdateVehicleRequest } from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";

export const EditVehicle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicle = useAppSelector((s) => s.vehicles.vehicles.find((v) => String(v.id) === id));

  if (!vehicle) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeader title="Edit Vehicle" />
        <Card>
          <p className="text-gray-500">Vehicle not found.</p>
        </Card>
      </div>
    );
  }

  const initialValues: VehicleFormValues = {
    name: vehicle.name ?? "",
    year: vehicle.year != null ? Number(vehicle.year) : null,
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    trim: vehicle.trim ?? "",
    tankCapacityGallons: vehicle.tankCapacityGallons != null ? Number(vehicle.tankCapacityGallons) : null,
    initialOdometer: null,
    startDate: null,
    plateState: vehicle.plateState ?? "",
    plateNumber: vehicle.plateNumber ?? "",
    vin: vehicle.vin ?? "",
  };

  const handleSubmit = async (values: UpdateVehicleRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(updateVehicle({ id: Number(id), body: values })).unwrap();
      navigate("/vehicles");
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startDate = vehicle.startDate ? new Date(`${vehicle.startDate}T00:00:00`).toLocaleDateString() : "—";
  const initialOdometer =
    vehicle.initialOdometer != null ? `${Number(vehicle.initialOdometer).toLocaleString()} mi` : "—";

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageHeader
        title="Edit Vehicle"
        actions={
          <Button
            label="Recalls"
            icon={<FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />}
            className="p-button-sm p-button-outlined"
            onClick={() => navigate(`/vehicles/${id}/recalls`)}
          />
        }
      />
      <Card>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <dl className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <dt className="text-content-muted">Starting Odometer</dt>
            <dd className="font-numeric">{initialOdometer}</dd>
          </div>
          <div>
            <dt className="text-content-muted">Start Date</dt>
            <dd>{startDate}</dd>
          </div>
        </dl>
        <VehicleForm
          initialValues={initialValues}
          isEdit
          submitting={submitting}
          onSubmit={(v) => void handleSubmit(v as UpdateVehicleRequest)}
        />
      </Card>
    </div>
  );
};
