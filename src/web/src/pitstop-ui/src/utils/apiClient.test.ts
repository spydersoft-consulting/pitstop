import { describe, it, expect, afterEach } from "vitest";
import { createApiClient } from "./apiClient";

afterEach(() => {
  globalThis.__config = undefined;
});

describe("createApiClient", () => {
  it("uses the configured base URL", () => {
    globalThis.__config = { api_url: "https://api.example.com" };
    const client = createApiClient();
    expect(client.defaults.baseURL).toBe("https://api.example.com");
    expect(client.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("falls back to the default base URL", () => {
    const client = createApiClient();
    expect(client.defaults.baseURL).toBe("/api/v1");
  });

  it("adds a bearer Authorization header when given a token", () => {
    const client = createApiClient("abc.123");
    expect(client.defaults.headers.Authorization).toBe("Bearer abc.123");
  });

  it("omits the Authorization header when no token is given", () => {
    const client = createApiClient();
    expect(client.defaults.headers.Authorization).toBeUndefined();
  });
});
