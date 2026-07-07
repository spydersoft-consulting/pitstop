import {
  getApiV1Locations,
  postApiV1Locations,
} from "./generated/sdk.gen";
import { client } from "./pitstopClient";
import type { CreateLocationRequest, LocationDto } from "./generated/types.gen";

export type LocationListParams = {
  search?: string;
  limit?: number;
  orderBy?: "recent" | "name";
};

export type UpdateLocationRequest = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
};

export const locationsApi = {
  list: async (params: LocationListParams = {}): Promise<LocationDto[]> => {
    const { data } = await getApiV1Locations({
      query: {
        Search: params.search,
        Limit: params.limit,
        OrderBy: params.orderBy,
      },
    });
    return data ?? [];
  },

  create: async (body: CreateLocationRequest): Promise<LocationDto> => {
    const { data } = await postApiV1Locations({ body });
    return data as LocationDto;
  },

  update: async (id: number, body: UpdateLocationRequest): Promise<LocationDto> => {
    const response = await client.instance.put<LocationDto>(
      `/api/v1/locations/${id}`,
      body,
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await client.instance.delete(`/api/v1/locations/${id}`);
  },
};
