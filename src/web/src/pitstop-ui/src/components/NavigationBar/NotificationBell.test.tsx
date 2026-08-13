import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { NotificationBell } from "./NotificationBell";
import { notificationSliceReducer, type Notification } from "../../store/slices/notificationSlice";

vi.mock("../../api/notificationApi", () => ({
  notificationApi: {
    list: vi.fn().mockResolvedValue([]),
    unreadCount: vi.fn().mockResolvedValue(0),
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
    subject: `Recall notice ${id}`,
    body: "body",
    data: null,
    priority: "High",
    status: "Dispatched",
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    entityType: "Vehicle",
    entityId: "42",
    ...overrides,
  }) as Notification;

function renderBell(items: Notification[] = [], unreadCount = 0) {
  const store = configureStore({
    reducer: { notifications: notificationSliceReducer },
    preloadedState: { notifications: { items, unreadCount, loading: false } },
  });
  return {
    store,
    ...render(
      <MemoryRouter>
        <Provider store={store}>
          <NotificationBell />
        </Provider>
      </MemoryRouter>,
    ),
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationApi.list).mockResolvedValue([]);
  });

  it("shows no badge when there are no unread notifications", () => {
    renderBell([], 0);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows an unread badge count", () => {
    renderBell([n("1")], 3);
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 99+", () => {
    renderBell([], 150);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("opens the panel and lists notifications on click", async () => {
    const user = userEvent.setup();
    // handleOpen re-fetches on click, so the mock (not preloaded state) is what ends up rendered.
    vi.mocked(notificationApi.list).mockResolvedValueOnce([n("1", { subject: "Recall notice for your Civic" })]);
    renderBell([], 1);
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    expect(await screen.findByText("Recall notice for your Civic")).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", async () => {
    const user = userEvent.setup();
    renderBell([], 0);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });
});
