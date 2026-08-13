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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

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
    mockNavigate.mockClear();
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

  it("marks all read and hides the Mark all read control once unreadCount hits 0", async () => {
    const user = userEvent.setup();
    vi.mocked(notificationApi.markAllRead).mockResolvedValue(2);
    vi.mocked(notificationApi.list).mockResolvedValueOnce([n("1"), n("2")]);
    renderBell([n("1"), n("2")], 2);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await screen.findByText("Recall notice 1");
    await user.click(screen.getByText("Mark all read"));

    expect(notificationApi.markAllRead).toHaveBeenCalledTimes(1);
    await screen.findByRole("button", { name: "Notifications" });
    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });

  it("marks an unread notification read and navigates to its linked vehicle", async () => {
    const user = userEvent.setup();
    vi.mocked(notificationApi.markRead).mockResolvedValue(n("1", { isRead: true }));
    vi.mocked(notificationApi.list).mockResolvedValueOnce([
      n("1", { subject: "Recall notice for your Civic", entityType: "Vehicle", entityId: "42" }),
    ]);
    renderBell([], 1);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(await screen.findByText("Recall notice for your Civic"));

    expect(notificationApi.markRead).toHaveBeenCalledWith("1");
    expect(mockNavigate).toHaveBeenCalledWith("/vehicles/42/edit");
  });

  it("does not re-mark an already-read notification but still navigates", async () => {
    const user = userEvent.setup();
    vi.mocked(notificationApi.list).mockResolvedValueOnce([
      n("1", { subject: "Already read", isRead: true, entityType: "Vehicle", entityId: "7" }),
    ]);
    renderBell([], 0);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(await screen.findByText("Already read"));

    expect(notificationApi.markRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/vehicles/7/edit");
  });

  it("does not navigate for a notification with no linkable entity", async () => {
    const user = userEvent.setup();
    vi.mocked(notificationApi.markRead).mockResolvedValue(n("1", { isRead: true }));
    vi.mocked(notificationApi.list).mockResolvedValueOnce([
      n("1", { subject: "General notice", entityType: null, entityId: null }),
    ]);
    renderBell([], 1);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(await screen.findByText("General notice"));

    expect(notificationApi.markRead).toHaveBeenCalledWith("1");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
