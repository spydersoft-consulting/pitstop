import { notificationClient } from "./notificationClient";
import type { DeviceDto, NotificationDto, RegisterDeviceRequest, UnreadCountResponse } from "./types";

export interface NotificationListParams {
  unreadOnly?: boolean;
  source?: string;
  type?: string;
  skip?: number;
  limit?: number;
}

export const notificationApi = {
  list: async (params: NotificationListParams = {}): Promise<NotificationDto[]> => {
    const { data } = await notificationClient.get<NotificationDto[]>("/api/v1/notifications", {
      params: {
        unreadOnly: params.unreadOnly,
        source: params.source,
        type: params.type,
        skip: params.skip,
        limit: params.limit,
      },
    });
    return data ?? [];
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await notificationClient.get<UnreadCountResponse>("/api/v1/notifications/unread-count");
    return data?.count ?? 0;
  },

  markRead: async (id: string): Promise<NotificationDto> => {
    const { data } = await notificationClient.post<NotificationDto>(`/api/v1/notifications/${id}/read`);
    return data;
  },

  markAllRead: async (): Promise<number> => {
    const { data } = await notificationClient.post<{ updatedCount: number }>("/api/v1/notifications/read-all");
    return data?.updatedCount ?? 0;
  },

  registerDevice: async (body: RegisterDeviceRequest): Promise<DeviceDto> => {
    const { data } = await notificationClient.post<DeviceDto>("/api/v1/devices", body);
    return data;
  },
};
