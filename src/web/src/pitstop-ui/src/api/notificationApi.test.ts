import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./notificationClient", () => ({
  notificationClient: { get: vi.fn(), post: vi.fn() },
}));

import { notificationClient } from "./notificationClient";
import { notificationApi } from "./notificationApi";

describe("notificationApi response handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list returns the notifications when the service answers with an array", async () => {
    vi.mocked(notificationClient.get).mockResolvedValue({ data: [{ id: "1" }] });

    expect(await notificationApi.list()).toEqual([{ id: "1" }]);
  });

  it.each([
    ["an HTML page", "<html>oops</html>"],
    ["null", null],
    ["an object", { message: "nope" }],
  ])("list returns an empty list when the response body is %s", async (_label, body) => {
    vi.mocked(notificationClient.get).mockResolvedValue({ data: body });

    expect(await notificationApi.list()).toEqual([]);
  });

  it("unreadCount returns the count when present", async () => {
    vi.mocked(notificationClient.get).mockResolvedValue({ data: { count: 3 } });

    expect(await notificationApi.unreadCount()).toBe(3);
  });

  it.each([
    ["an HTML page", "<html>oops</html>"],
    ["null", null],
    ["a non-numeric count", { count: "many" }],
  ])("unreadCount returns 0 when the response body is %s", async (_label, body) => {
    vi.mocked(notificationClient.get).mockResolvedValue({ data: body });

    expect(await notificationApi.unreadCount()).toBe(0);
  });
});
