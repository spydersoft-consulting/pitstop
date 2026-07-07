import {
  getApiV1VehiclesByVehicleIdAnalyticsSummary,
  getApiV1VehiclesByVehicleIdAnalyticsMpg,
  getApiV1VehiclesByVehicleIdAnalyticsSpend,
} from "./generated/sdk.gen";
import type {
  MpgOverTimeResponse,
  SpendResponse,
  SummaryResponse,
} from "./generated/types.gen";

export const analyticsApi = {
  summary: async (vehicleId: number): Promise<SummaryResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdAnalyticsSummary({
      path: { vehicleId },
    });
    return data ?? {};
  },
  mpg: async (vehicleId: number): Promise<MpgOverTimeResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdAnalyticsMpg({
      path: { vehicleId },
    });
    return data ?? { points: [] };
  },
  spend: async (vehicleId: number): Promise<SpendResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdAnalyticsSpend({
      path: { vehicleId },
    });
    return data ?? { points: [] };
  },
};
