import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotificationPushDto } from "../api/types";

const mockConnection = {
  start: vi.fn(),
  stop: vi.fn(),
  state: "Disconnected",
};

let capturedOnReceive: ((push: NotificationPushDto) => void) | undefined;

vi.mock("./notificationHub", () => ({
  createNotificationHubConnection: vi.fn((onReceive: (push: NotificationPushDto) => void) => {
    capturedOnReceive = onReceive;
    return mockConnection;
  }),
}));

vi.mock("@microsoft/signalr", () => ({
  HubConnectionState: { Disconnected: "Disconnected" },
}));

const mockDispatch = vi.fn();
vi.mock("../store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock("../api/notificationApi", () => ({
  notificationApi: { registerDevice: vi.fn() },
}));

import { createNotificationHubConnection } from "./notificationHub";
import { notificationApi } from "../api/notificationApi";
import { notificationReceived } from "../store/slices/notificationSlice";
import { useNotificationHub } from "./useNotificationHub";

describe("useNotificationHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection.start.mockResolvedValue(undefined);
    mockConnection.stop.mockResolvedValue(undefined);
    mockConnection.state = "Disconnected";
    capturedOnReceive = undefined;
  });

  it("does nothing when disabled", () => {
    renderHook(() => useNotificationHub(false));
    expect(createNotificationHubConnection).not.toHaveBeenCalled();
  });

  it("starts the connection and registers a device once, when enabled", async () => {
    renderHook(() => useNotificationHub(true));
    expect(createNotificationHubConnection).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(notificationApi.registerDevice).toHaveBeenCalledTimes(1));
    expect(notificationApi.registerDevice).toHaveBeenCalledWith({
      deviceType: "Web",
      label: navigator.userAgent,
    });
  });

  it("dispatches notificationReceived when a push arrives", () => {
    renderHook(() => useNotificationHub(true));
    const push: NotificationPushDto = {
      id: "1",
      source: "pitstop",
      type: "recall-alert",
      subject: "s",
      body: "b",
      priority: "High",
      createdAt: "2026-08-13T00:00:00.000Z",
    };
    capturedOnReceive?.(push);
    expect(mockDispatch).toHaveBeenCalledWith(notificationReceived(push));
  });

  it("does not register a device when the connection fails to start", async () => {
    mockConnection.start.mockRejectedValue(new Error("network down"));
    renderHook(() => useNotificationHub(true));
    await waitFor(() => expect(mockConnection.start).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notificationApi.registerDevice).not.toHaveBeenCalled();
  });

  it("stops the connection on unmount if not already disconnected", async () => {
    mockConnection.state = "Connected";
    const { unmount } = renderHook(() => useNotificationHub(true));
    await waitFor(() => expect(notificationApi.registerDevice).toHaveBeenCalled());
    unmount();
    expect(mockConnection.stop).toHaveBeenCalledTimes(1);
  });

  it("does not stop an already-disconnected connection on unmount", async () => {
    mockConnection.state = "Disconnected";
    const { unmount } = renderHook(() => useNotificationHub(true));
    await waitFor(() => expect(notificationApi.registerDevice).toHaveBeenCalled());
    unmount();
    expect(mockConnection.stop).not.toHaveBeenCalled();
  });
});
