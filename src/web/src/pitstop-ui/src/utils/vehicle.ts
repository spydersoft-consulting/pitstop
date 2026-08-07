import type { Vehicle } from "../store/slices/vehicleSlice";

export const formatVehicleLabel = (vehicle: Vehicle): string => {
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const detail = [vehicle.name, vehicle.trim].filter(Boolean).join(" · ");

  return [title, detail].filter(Boolean).join(" — ");
};
