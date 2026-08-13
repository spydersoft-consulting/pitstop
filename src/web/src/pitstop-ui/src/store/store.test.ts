import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("wires up every slice reducer with its initial state", () => {
    const state = store.getState();
    expect(state.vehicles).toBeDefined();
    expect(state.fillUps).toBeDefined();
    expect(state.locations).toBeDefined();
    expect(state.maintenanceLogs).toBeDefined();
    expect(state.notifications).toEqual({ items: [], unreadCount: 0, loading: false });
  });

  it("persists state to localStorage on dispatch", () => {
    expect(localStorage.getItem("pitstop_state")).toBeNull();
    store.dispatch({ type: "noop" });
    expect(localStorage.getItem("pitstop_state")).not.toBeNull();
  });
});
