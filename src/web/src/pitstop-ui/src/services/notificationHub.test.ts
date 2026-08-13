import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConnection = { on: vi.fn(), start: vi.fn(), stop: vi.fn(), state: "Disconnected" };
const builder = {
  withUrl: vi.fn().mockReturnThis(),
  withAutomaticReconnect: vi.fn().mockReturnThis(),
  build: vi.fn(() => mockConnection),
};

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn(function HubConnectionBuilder() {
    return builder;
  }),
}));

import { HubConnectionBuilder } from "@microsoft/signalr";
import { createNotificationHubConnection } from "./notificationHub";

describe("createNotificationHubConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a connection to the BFF's notification-hub proxy route", () => {
    createNotificationHubConnection(vi.fn());
    expect(HubConnectionBuilder).toHaveBeenCalledTimes(1);
    expect(builder.withUrl).toHaveBeenCalledWith("/notification-hub/hubs/notifications");
    expect(builder.withAutomaticReconnect).toHaveBeenCalled();
    expect(builder.build).toHaveBeenCalled();
  });

  it("registers the onReceive callback for ReceiveNotification pushes", () => {
    const onReceive = vi.fn();
    const connection = createNotificationHubConnection(onReceive);
    expect(mockConnection.on).toHaveBeenCalledWith("ReceiveNotification", onReceive);
    expect(connection).toBe(mockConnection);
  });
});
