import {
  getApiV1VehiclesByVehicleIdFillups,
  postApiV1VehiclesByVehicleIdFillups,
  putApiV1VehiclesByVehicleIdFillupsById,
  deleteApiV1VehiclesByVehicleIdFillupsById,
} from "./generated/sdk.gen";
import type {
  CreateFillUpRequest,
  FillUpDto,
  FillUpListResponse,
  FillUpRequest,
} from "./generated/types.gen";

export const fillUpsApi = {
  list: async (
    vehicleId: number,
    query?: { Page?: number; PageSize?: number; Order?: "asc" | "desc" },
  ): Promise<FillUpListResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdFillups({
      path: { vehicleId },
      query,
    });
    return data ?? { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  create: async (vehicleId: number, body: CreateFillUpRequest): Promise<FillUpDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdFillups({
      path: { vehicleId },
      body,
    });
    return data as FillUpDto;
  },

  update: async (vehicleId: number, id: number, body: FillUpRequest): Promise<FillUpDto> => {
    const { data } = await putApiV1VehiclesByVehicleIdFillupsById({
      path: { vehicleId, id },
      body,
    });
    return data as FillUpDto;
  },

  delete: async (vehicleId: number, id: number): Promise<void> => {
    await deleteApiV1VehiclesByVehicleIdFillupsById({
      path: { vehicleId, id },
    });
  },
};
