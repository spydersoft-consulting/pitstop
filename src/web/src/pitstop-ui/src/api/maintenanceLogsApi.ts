import {
  getApiV1VehiclesByVehicleIdMaintenance,
  postApiV1VehiclesByVehicleIdMaintenance,
  putApiV1VehiclesByVehicleIdMaintenanceById,
  deleteApiV1VehiclesByVehicleIdMaintenanceById,
} from "./generated/sdk.gen";
import type {
  CreateMaintenanceLogRequest,
  MaintenanceLogDto,
  MaintenanceLogListResponse,
  UpdateMaintenanceLogRequest,
} from "./generated/types.gen";

export const maintenanceLogsApi = {
  list: async (
    vehicleId: number,
    query?: { Page?: number; PageSize?: number; Order?: "asc" | "desc" },
  ): Promise<MaintenanceLogListResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdMaintenance({
      path: { vehicleId },
      query,
    });
    return data ?? { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  create: async (vehicleId: number, body: CreateMaintenanceLogRequest): Promise<MaintenanceLogDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdMaintenance({
      path: { vehicleId },
      body,
    });
    return data as MaintenanceLogDto;
  },

  update: async (vehicleId: number, id: number, body: UpdateMaintenanceLogRequest): Promise<MaintenanceLogDto> => {
    const { data } = await putApiV1VehiclesByVehicleIdMaintenanceById({
      path: { vehicleId, id },
      body,
    });
    return data as MaintenanceLogDto;
  },

  delete: async (vehicleId: number, id: number): Promise<void> => {
    await deleteApiV1VehiclesByVehicleIdMaintenanceById({
      path: { vehicleId, id },
    });
  },
};
