import {
  postApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsInitiate,
  postApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentIdConfirm,
  getApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentIdUrl,
  deleteApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentId,
} from "./generated/sdk.gen";
import type {
  FileUrlResponse,
  InitiateAttachmentUploadRequest,
  InitiateAttachmentUploadResponse,
  MaintenanceAttachmentDto,
} from "./generated/types.gen";

export const maintenanceAttachmentsApi = {
  initiate: async (
    vehicleId: number,
    id: number,
    body: InitiateAttachmentUploadRequest,
  ): Promise<InitiateAttachmentUploadResponse> => {
    const { data } = await postApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsInitiate({
      path: { vehicleId, id },
      body,
    });
    return data as InitiateAttachmentUploadResponse;
  },

  confirm: async (vehicleId: number, id: number, attachmentId: number): Promise<MaintenanceAttachmentDto> => {
    const { data } = await postApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentIdConfirm({
      path: { vehicleId, id, attachmentId },
    });
    return data as MaintenanceAttachmentDto;
  },

  getUrl: async (vehicleId: number, id: number, attachmentId: number): Promise<FileUrlResponse> => {
    const { data } = await getApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentIdUrl({
      path: { vehicleId, id, attachmentId },
    });
    return data as FileUrlResponse;
  },

  delete: async (vehicleId: number, id: number, attachmentId: number): Promise<void> => {
    await deleteApiV1VehiclesByVehicleIdMaintenanceByIdAttachmentsByAttachmentId({
      path: { vehicleId, id, attachmentId },
    });
  },

  uploadToPresignedUrl: async (uploadUrl: string, file: File): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  },
};
