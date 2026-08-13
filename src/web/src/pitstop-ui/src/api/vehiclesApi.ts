import {
  getApiV1Vehicles,
  postApiV1Vehicles,
  putApiV1VehiclesById,
  deleteApiV1VehiclesById,
  getApiV1VehiclesByVehicleIdRecalls,
} from "./generated/sdk.gen";
import type { CreateVehicleRequest, UpdateVehicleRequest, VehicleDto, RecallDto } from "./generated/types.gen";

export const vehiclesApi = {
  list: async (): Promise<VehicleDto[]> => {
    const { data } = await getApiV1Vehicles();
    return data ?? [];
  },
  create: async (body: CreateVehicleRequest): Promise<VehicleDto> => {
    const { data } = await postApiV1Vehicles({ body });
    return data as VehicleDto;
  },
  update: async (id: number, body: UpdateVehicleRequest): Promise<VehicleDto> => {
    const { data } = await putApiV1VehiclesById({ path: { id }, body });
    return data as VehicleDto;
  },
  delete: async (id: number): Promise<void> => {
    await deleteApiV1VehiclesById({ path: { id } });
  },
  recalls: async (vehicleId: number): Promise<RecallDto[]> => {
    const { data } = await getApiV1VehiclesByVehicleIdRecalls({ path: { vehicleId } });
    return data ?? [];
  },
};
