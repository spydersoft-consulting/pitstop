import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { notificationApi } from "../../api/notificationApi";
import type { NotificationDto, NotificationPushDto } from "../../api/types";

export type Notification = NotificationDto;

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
};

export const fetchNotifications = createAsyncThunk("notifications/fetch", async () => {
  return notificationApi.list({ limit: 20 });
});

export const fetchUnreadCount = createAsyncThunk("notifications/fetchUnreadCount", async () => {
  return notificationApi.unreadCount();
});

export const markNotificationRead = createAsyncThunk("notifications/markRead", async (id: string) => {
  return notificationApi.markRead(id);
});

export const markAllNotificationsRead = createAsyncThunk("notifications/markAllRead", async () => {
  return notificationApi.markAllRead();
});

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Pushed live over the SignalR hub -- not the source of truth (see realtime-spec.md), just
    // a best-effort nudge so the bell updates without waiting for the next poll.
    notificationReceived(state, action: PayloadAction<NotificationPushDto>) {
      const push = action.payload;
      if (state.items.some((n) => n.id === push.id)) return;
      state.items.unshift({
        ...push,
        userId: "",
        data: null,
        status: "Created",
        isRead: false,
        readAt: null,
        entityType: null,
        entityId: null,
      });
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        const wasUnread = idx !== -1 && !state.items[idx].isRead;
        if (idx !== -1) state.items[idx] = action.payload;
        if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => (n.isRead ? n : { ...n, isRead: true }));
        state.unreadCount = 0;
      });
  },
});

export const { notificationReceived } = notificationSlice.actions;
export const notificationSliceReducer = notificationSlice.reducer;
