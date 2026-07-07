import { describe, it, expect, afterEach } from "vitest";
import { getConfig } from "./Config";

afterEach(() => {
  globalThis.__config = undefined;
});

describe("getConfig", () => {
  it("returns the default api_url when no override is set", () => {
    expect(getConfig("api_url")).toBe("/api/v1");
  });

  it("returns the overridden value when set on globalThis.__config", () => {
    globalThis.__config = { api_url: "https://api.example.com" };
    expect(getConfig("api_url")).toBe("https://api.example.com");
  });

  it("falls back to the default when the override is partial/missing", () => {
    globalThis.__config = {};
    expect(getConfig("api_url")).toBe("/api/v1");
  });
});
