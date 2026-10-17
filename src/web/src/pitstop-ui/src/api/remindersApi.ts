import {
  getApiV1ReminderTemplates,
  getApiV1VehiclesByVehicleIdReminders,
  getApiV1VehiclesByVehicleIdRemindersByIdHistory,
  postApiV1VehiclesByVehicleIdReminders,
  putApiV1VehiclesByVehicleIdRemindersById,
  deleteApiV1VehiclesByVehicleIdRemindersById,
  postApiV1VehiclesByVehicleIdRemindersFromTemplates,
  postApiV1VehiclesByVehicleIdRemindersByIdComplete,
  postApiV1VehiclesByVehicleIdRemindersByIdSnooze,
} from "./generated/sdk.gen";
import type {
  CompleteReminderRequest,
  ReminderDto,
  ReminderHistoryEntryDto,
  ReminderRequest,
  ReminderTemplateDto,
  SnoozeReminderRequest,
} from "./generated/types.gen";

export const remindersApi = {
  list: async (vehicleId: number): Promise<ReminderDto[]> => {
    const { data } = await getApiV1VehiclesByVehicleIdReminders({ path: { vehicleId } });
    return data ?? [];
  },

  history: async (vehicleId: number, id: number): Promise<ReminderHistoryEntryDto[]> => {
    const { data } = await getApiV1VehiclesByVehicleIdRemindersByIdHistory({ path: { vehicleId, id } });
    return Array.isArray(data) ? data : [];
  },

  templates: async (): Promise<ReminderTemplateDto[]> => {
    const { data } = await getApiV1ReminderTemplates();
    return data ?? [];
  },

  create: async (vehicleId: number, body: ReminderRequest): Promise<ReminderDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdReminders({ path: { vehicleId }, body });
    return data as ReminderDto;
  },

  createFromTemplates: async (vehicleId: number, serviceTypes: string[]): Promise<ReminderDto[]> => {
    const { data } = await postApiV1VehiclesByVehicleIdRemindersFromTemplates({
      path: { vehicleId },
      body: { serviceTypes },
    });
    return data ?? [];
  },

  update: async (vehicleId: number, id: number, body: ReminderRequest): Promise<ReminderDto> => {
    const { data } = await putApiV1VehiclesByVehicleIdRemindersById({ path: { vehicleId, id }, body });
    return data as ReminderDto;
  },

  delete: async (vehicleId: number, id: number): Promise<void> => {
    await deleteApiV1VehiclesByVehicleIdRemindersById({ path: { vehicleId, id } });
  },

  complete: async (vehicleId: number, id: number, body: CompleteReminderRequest): Promise<ReminderDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdRemindersByIdComplete({ path: { vehicleId, id }, body });
    return data as ReminderDto;
  },

  snooze: async (vehicleId: number, id: number, body: SnoozeReminderRequest): Promise<ReminderDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdRemindersByIdSnooze({ path: { vehicleId, id }, body });
    return data as ReminderDto;
  },
};
