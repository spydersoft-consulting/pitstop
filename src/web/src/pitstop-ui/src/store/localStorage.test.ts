import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState } from "./localStorage";
import type { RootState } from "./store";

const KEY = "pitstop_state";
const VERSION = 7;

const sampleState = (): RootState => ({
  vehicles: { vehicles: [], selectedVehicleId: null, loading: false },
  fillUps: { recentFillUps: [], loading: false },
  locations: { locations: [], loading: false },
  maintenanceLogs: { recentMaintenanceLogs: [], loading: false },
  notifications: { items: [], unreadCount: 0, loading: false },
});

describe("localStorage state persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns undefined when nothing is stored", () => {
    expect(loadState()).toBeUndefined();
  });

  it("round-trips a valid state through save -> load", () => {
    const state = sampleState();
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it("writes a versioned envelope around the state", () => {
    saveState(sampleState());
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(VERSION);
    expect(parsed.state).toBeDefined();
  });

  it("ignores stored data without a version (legacy)", () => {
    localStorage.setItem(KEY, JSON.stringify({ vehicles: { vehicles: [] } }));
    expect(loadState()).toBeUndefined();
  });

  it("ignores stored data with a mismatched version", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION - 1, state: sampleState() }));
    expect(loadState()).toBeUndefined();
  });

  it("rejects payloads with the wrong vehicle shape", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: VERSION,
        state: { vehicles: { vehicles: "not-an-array" } },
      }),
    );
    expect(loadState()).toBeUndefined();
  });

  it("rejects payloads with the wrong fillUps shape", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: VERSION,
        state: { fillUps: { recentFillUps: 42 } },
      }),
    );
    expect(loadState()).toBeUndefined();
  });

  it("rejects payloads with the wrong maintenanceLogs shape", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: VERSION,
        state: { maintenanceLogs: { recentMaintenanceLogs: 42 } },
      }),
    );
    expect(loadState()).toBeUndefined();
  });

  it("rejects payloads with the wrong notifications shape", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: VERSION,
        state: { notifications: { items: 42 } },
      }),
    );
    expect(loadState()).toBeUndefined();
  });

  it("returns undefined when the payload is not valid JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadState()).toBeUndefined();
  });
});
