import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useSelectedVehicle = () =>
  useAppSelector((state) => state.vehicles.vehicles.find((v) => v.id === state.vehicles.selectedVehicleId));
