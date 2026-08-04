import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { maintenanceLogsApi } from "../../api/maintenanceLogsApi";
import { maintenanceAttachmentsApi } from "../../api/maintenanceAttachmentsApi";
import type {
  CreateMaintenanceLogRequest,
  MaintenanceAttachmentDto,
  MaintenanceLogDto,
  UpdateMaintenanceLogRequest,
} from "../../api/generated/types.gen";

export type MaintenanceLog = MaintenanceLogDto;

interface MaintenanceLogState {
  recentMaintenanceLogs: MaintenanceLog[];
  loading: boolean;
}

const initialState: MaintenanceLogState = {
  recentMaintenanceLogs: [],
  loading: false,
};

export const fetchMaintenanceLogs = createAsyncThunk("maintenanceLogs/fetch", (vehicleId: number) =>
  maintenanceLogsApi.list(vehicleId, { PageSize: 100, Order: "desc" }).then((r) => r.items ?? []),
);

export const createMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/create",
  ({ vehicleId, body }: { vehicleId: number; body: CreateMaintenanceLogRequest }) =>
    maintenanceLogsApi.create(vehicleId, body),
);

export const updateMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/update",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: UpdateMaintenanceLogRequest }) =>
    maintenanceLogsApi.update(vehicleId, id, body),
);

export const deleteMaintenanceLog = createAsyncThunk(
  "maintenanceLogs/delete",
  async ({ vehicleId, id }: { vehicleId: number; id: number }) => {
    await maintenanceLogsApi.delete(vehicleId, id);
    return id;
  },
);

export const uploadMaintenanceAttachment = createAsyncThunk(
  "maintenanceLogs/uploadAttachment",
  async ({ vehicleId, id, file }: { vehicleId: number; id: number; file: File }) => {
    const initiated = await maintenanceAttachmentsApi.initiate(vehicleId, id, {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    await maintenanceAttachmentsApi.uploadToPresignedUrl(initiated.uploadUrl!, file);
    const attachment = await maintenanceAttachmentsApi.confirm(vehicleId, id, Number(initiated.attachmentId));
    return { logId: id, attachment };
  },
);

export const deleteMaintenanceAttachment = createAsyncThunk(
  "maintenanceLogs/deleteAttachment",
  async ({ vehicleId, id, attachmentId }: { vehicleId: number; id: number; attachmentId: number }) => {
    await maintenanceAttachmentsApi.delete(vehicleId, id, attachmentId);
    return { logId: id, attachmentId };
  },
);

const maintenanceLogSlice = createSlice({
  name: "maintenanceLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaintenanceLogs.pending, (state) => {
        state.loading = true;
        state.recentMaintenanceLogs = [];
      })
      .addCase(fetchMaintenanceLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.recentMaintenanceLogs = action.payload;
      })
      .addCase(fetchMaintenanceLogs.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createMaintenanceLog.fulfilled, (state, action) => {
        state.recentMaintenanceLogs.unshift(action.payload);
      })
      .addCase(updateMaintenanceLog.fulfilled, (state, action) => {
        const idx = state.recentMaintenanceLogs.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.recentMaintenanceLogs[idx] = action.payload;
      })
      .addCase(deleteMaintenanceLog.fulfilled, (state, action) => {
        state.recentMaintenanceLogs = state.recentMaintenanceLogs.filter((f) => f.id !== action.payload);
      })
      .addCase(uploadMaintenanceAttachment.fulfilled, (state, action) => {
        const { logId, attachment } = action.payload;
        const log = state.recentMaintenanceLogs.find((f) => f.id === logId);
        if (log) {
          log.attachments = [...(log.attachments ?? []), attachment];
        }
      })
      .addCase(deleteMaintenanceAttachment.fulfilled, (state, action) => {
        const { logId, attachmentId } = action.payload;
        const log = state.recentMaintenanceLogs.find((f) => f.id === logId);
        if (log) {
          log.attachments = (log.attachments ?? []).filter((a: MaintenanceAttachmentDto) => a.id !== attachmentId);
        }
      });
  },
});

export const maintenanceLogSliceReducer = maintenanceLogSlice.reducer;
