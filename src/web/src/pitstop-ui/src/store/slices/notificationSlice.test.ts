import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  notificationSliceReducer,
  notificationReceived,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "./notificationSlice";

vi.mock("../../api/notificationApi", () => ({
  notificationApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    registerDevice: vi.fn(),
  },
}));

import { notificationApi } from "../../api/notificationApi";

const n = (id: string, overrides: Partial<Notification> = {}): Notification =>
  ({
    id,
    userId: "user-1",
    source: "pitstop",
    type: "recall-alert",
    subject: `Recall ${id}`,
    body: "body",
    data: null,
    priority: "High",
    status: "Dispatched",
    isRead: false,
    readAt: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    entityType: "Vehicle",
    entityId: "42",
    ...overrides,
  }) as Notification;

function makeStore() {
  return configureStore({ reducer: { notifications: notificationSliceReducer } });
}

describe("notificationSlice thunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchNotifications populates items", async () => {
    vi.mocked(notificationApi.list).mockResolvedValue([n("1"), n("2")]);
    const store = makeStore();
    await store.dispatch(fetchNotifications());
    const state = store.getState().notifications;
    expect(state.items).toHaveLength(2);
    expect(state.loading).toBe(false);
  });

  it("fetchUnreadCount sets unreadCount", async () => {
    vi.mocked(notificationApi.unreadCount).mockResolvedValue(3);
    const store = makeStore();
    await store.dispatch(fetchUnreadCount());
    expect(store.getState().notifications.unreadCount).toBe(3);
  });

  it("markNotificationRead updates the entry and decrements unreadCount", async () => {
    const store = makeStore();
    vi.mocked(notificationApi.list).mockResolvedValue([n("1"), n("2")]);
    await store.dispatch(fetchNotifications());
    await store.dispatch(fetchUnreadCount.fulfilled(2, "", undefined));

    vi.mocked(notificationApi.markRead).mockResolvedValue(n("1", { isRead: true }));
    await store.dispatch(markNotificationRead("1"));

    const state = store.getState().notifications;
    expect(state.items.find((x) => x.id === "1")?.isRead).toBe(true);
    expect(state.unreadCount).toBe(1);
  });

  it("markNotificationRead on an already-read entry does not go negative", async () => {
    const store = makeStore();
    vi.mocked(notificationApi.list).mockResolvedValue([n("1", { isRead: true })]);
    await store.dispatch(fetchNotifications());

    vi.mocked(notificationApi.markRead).mockResolvedValue(n("1", { isRead: true }));
    await store.dispatch(markNotificationRead("1"));

    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it("markAllNotificationsRead marks every item read and zeroes the count", async () => {
    const store = makeStore();
    vi.mocked(notificationApi.list).mockResolvedValue([n("1"), n("2")]);
    await store.dispatch(fetchNotifications());

    vi.mocked(notificationApi.markAllRead).mockResolvedValue(2);
    await store.dispatch(markAllNotificationsRead());

    const state = store.getState().notifications;
    expect(state.items.every((x) => x.isRead)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it("notificationReceived prepends a push and increments unreadCount", () => {
    const store = makeStore();
    store.dispatch(
      notificationReceived({
        id: "3",
        source: "pitstop",
        type: "recall-alert",
        subject: "New recall",
        body: "body",
        priority: "High",
        createdAt: "2026-08-12T00:00:00.000Z",
      }),
    );
    const state = store.getState().notifications;
    expect(state.items[0].id).toBe("3");
    expect(state.unreadCount).toBe(1);
  });

  it("notificationReceived ignores a duplicate push (same id already present)", () => {
    const store = makeStore();
    const push = {
      id: "3",
      source: "pitstop",
      type: "recall-alert",
      subject: "New recall",
      body: "body",
      priority: "High" as const,
      createdAt: "2026-08-12T00:00:00.000Z",
    };
    store.dispatch(notificationReceived(push));
    store.dispatch(notificationReceived(push));
    const state = store.getState().notifications;
    expect(state.items).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });
});
