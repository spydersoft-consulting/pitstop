import { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import MainLayout from "../layouts/Main";
import { Dashboard } from "./Dashboard/Dashboard";
import { FillUpHistory } from "./FillUpHistory/FillUpHistory";
import { AddFillUp } from "./FillUpHistory/AddFillUp";
import { EditFillUp } from "./FillUpHistory/EditFillUp";
import { MaintenanceLogHistory } from "./MaintenanceLog/MaintenanceLogHistory";
import { AddMaintenanceLog } from "./MaintenanceLog/AddMaintenanceLog";
import { EditMaintenanceLog } from "./MaintenanceLog/EditMaintenanceLog";
import { Analytics } from "./Analytics/Analytics";
import { Vehicles } from "./Vehicles/Vehicles";
import { AddVehicle } from "./Vehicles/AddVehicle";
import { EditVehicle } from "./Vehicles/EditVehicle";
import { VehicleRecalls } from "./Vehicles/VehicleRecalls";
import { Landing } from "./Landing/Landing";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchVehicles } from "../store/slices/vehicleSlice";
import { fetchFillUps } from "../store/slices/fillUpSlice";
import { fetchMaintenanceLogs } from "../store/slices/maintenanceLogSlice";
import { fetchLocations } from "../store/slices/locationSlice";
import { fetchNotifications, fetchUnreadCount } from "../store/slices/notificationSlice";
import { Locations } from "./Locations/Locations";
import { useAuth } from "../context";
import { useNotificationHub } from "../services/useNotificationHub";

export const AppRouter: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedVehicleId } = useAppSelector((s) => s.vehicles);

  useNotificationHub(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchVehicles());
      void dispatch(fetchLocations());
      void dispatch(fetchNotifications());
      void dispatch(fetchUnreadCount());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedVehicleId != null) {
      void dispatch(fetchFillUps(selectedVehicleId));
      void dispatch(fetchMaintenanceLogs(selectedVehicleId));
    }
  }, [dispatch, isAuthenticated, selectedVehicleId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <ProgressSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Router basename="/">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fill-ups" element={<FillUpHistory />} />
          <Route path="/fill-ups/new" element={<AddFillUp />} />
          <Route path="/fill-ups/:id/edit" element={<EditFillUp />} />
          <Route path="/maintenance" element={<MaintenanceLogHistory />} />
          <Route path="/maintenance/new" element={<AddMaintenanceLog />} />
          <Route path="/maintenance/:id/edit" element={<EditMaintenanceLog />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/new" element={<AddVehicle />} />
          <Route path="/vehicles/:id/edit" element={<EditVehicle />} />
          <Route path="/vehicles/:id/recalls" element={<VehicleRecalls />} />
          <Route path="/locations" element={<Locations />} />
        </Route>
      </Routes>
    </Router>
  );
};
