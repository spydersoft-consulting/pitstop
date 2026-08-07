import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faPlus, faPencil, faTrash, faGaugeHigh } from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { selectVehicle, deleteVehicle, type Vehicle } from "../../store/slices/vehicleSlice";
import { PageHeader } from "../layout/PageHeader";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

interface AddTileProps {
  onClick: () => void;
  label: string;
}

const AddTile: React.FC<AddTileProps> = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl border-2 border-dashed border-border-strong hover:border-brand hover:bg-brand-tint transition-colors flex flex-col items-center justify-center text-center px-6 py-10 min-h-[140px] cursor-pointer bg-transparent text-content-muted hover:text-brand"
  >
    <FontAwesomeIcon icon={faPlus} className="text-2xl mb-2" />
    <span className="font-medium">{label}</span>
  </button>
);

interface VehicleCardProps {
  vehicle: Vehicle;
  isActive: boolean;
  mpgBadge: string | null;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, isActive, mpgBadge, onSelect, onEdit, onDelete }) => {
  const odo = num(vehicle.initialOdometer);
  return (
    <div
      className={[
        "rounded-xl bg-surface border transition-shadow hover:shadow-md",
        isActive ? "border-brand ring-1 ring-brand" : "border-border",
      ].join(" ")}
    >
      <div className="p-4 flex flex-col gap-3 h-full">
        <button
          type="button"
          onClick={onSelect}
          className="flex items-start gap-3 text-left cursor-pointer bg-transparent border-0 p-0 min-w-0"
        >
          <span
            className={[
              "flex h-12 w-12 items-center justify-center rounded-lg shrink-0",
              isActive ? "bg-brand text-brand-fg" : "bg-surface-muted text-content-muted",
            ].join(" ")}
          >
            <FontAwesomeIcon icon={faCar} className="text-xl" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg uppercase tracking-wide truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-content-muted truncate">
              {vehicle.name}
              {vehicle.trim ? ` · ${vehicle.trim}` : ""}
            </p>
            {vehicle.plateNumber && (
              <p className="text-meta text-content-muted truncate">
                {vehicle.plateState ? `${vehicle.plateState} · ` : ""}
                {vehicle.plateNumber}
              </p>
            )}
            {isActive && (
              <span className="inline-block mt-1 text-meta uppercase tracking-wide text-brand font-medium">Active</span>
            )}
          </div>
        </button>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-content-muted min-w-0">
            {mpgBadge && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint text-brand px-2 py-0.5 text-meta font-medium">
                <FontAwesomeIcon icon={faGaugeHigh} />
                {mpgBadge} mpg
              </span>
            )}
            {odo !== null && <span className="font-numeric truncate">{odo.toLocaleString()} mi</span>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              icon={<FontAwesomeIcon icon={faPencil} />}
              className="p-button-text p-button-sm p-button-secondary"
              tooltip="Edit"
              tooltipOptions={{ position: "top" }}
              onClick={onEdit}
              aria-label="Edit vehicle"
            />
            <Button
              icon={<FontAwesomeIcon icon={faTrash} />}
              className="p-button-text p-button-sm p-button-danger"
              tooltip="Delete"
              tooltipOptions={{ position: "top" }}
              onClick={onDelete}
              aria-label="Delete vehicle"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const Vehicles: React.FC = () => {
  const { vehicles, selectedVehicleId } = useAppSelector((s) => s.vehicles);
  const { recentFillUps } = useAppSelector((s) => s.fillUps);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toastRef = useRef(null);

  const activeMpg = useMemo(() => {
    const mpgs = recentFillUps.map((f) => num(f.mpgThisFillUp)).filter((v): v is number => v !== null);
    if (mpgs.length === 0) return null;
    return mpgs.reduce((a, b) => a + b, 0) / mpgs.length;
  }, [recentFillUps]);

  const handleDelete = (e: React.MouseEvent, vehicle: Vehicle) => {
    confirmPopup({
      target: e.currentTarget as HTMLElement,
      message: `Remove "${vehicle.name}"?`,
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger p-button-sm",
      rejectClassName: "p-button-sm p-button-outlined",
      accept: () => void dispatch(deleteVehicle(vehicle.id as number)),
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmPopup ref={toastRef} />
      <PageHeader
        title="Vehicles"
        actions={
          <Button
            label="Add"
            icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
            className="p-button-sm"
            onClick={() => navigate("/vehicles/new")}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {vehicles.map((vehicle: Vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            isActive={vehicle.id === selectedVehicleId}
            mpgBadge={vehicle.id === selectedVehicleId && activeMpg !== null ? activeMpg.toFixed(1) : null}
            onSelect={() => dispatch(selectVehicle(vehicle.id as number))}
            onEdit={() => navigate(`/vehicles/${vehicle.id as number}/edit`)}
            onDelete={(e) => handleDelete(e, vehicle)}
          />
        ))}
        {vehicles.length === 0 && <AddTile onClick={() => navigate("/vehicles/new")} label="Add your first vehicle" />}
      </div>
    </div>
  );
};
