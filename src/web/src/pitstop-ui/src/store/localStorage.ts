import type { RootState } from "./store";

const STATE_KEY = "pitstop_state";
const STATE_VERSION = 5;

interface VersionedState {
  version: number;
  state: Partial<RootState>;
}

const isObjectWithId = (x: unknown): boolean =>
  typeof x === "object" && x !== null && "id" in (x as Record<string, unknown>);

function isValidState(state: Partial<RootState>): boolean {
  if (state.vehicles !== undefined) {
    if (!Array.isArray(state.vehicles.vehicles)) return false;
    if (!state.vehicles.vehicles.every(isObjectWithId)) return false;
  }
  if (state.fillUps !== undefined) {
    if (!Array.isArray(state.fillUps.recentFillUps)) return false;
    if (!state.fillUps.recentFillUps.every(isObjectWithId)) return false;
  }
  if (state.locations !== undefined) {
    if (!Array.isArray(state.locations.locations)) return false;
    if (!state.locations.locations.every(isObjectWithId)) return false;
  }
  return true;
}

export function loadState(): Partial<RootState> | undefined {
  try {
    const serialized = localStorage.getItem(STATE_KEY);
    if (!serialized) return undefined;
    const parsed = JSON.parse(serialized) as
      | VersionedState
      | Partial<RootState>;
    if (!("version" in parsed) || parsed.version !== STATE_VERSION)
      return undefined;
    if (!isValidState(parsed.state)) return undefined;
    return parsed.state;
  } catch {
    return undefined;
  }
}

export function saveState(state: RootState): void {
  try {
    const versioned: VersionedState = { version: STATE_VERSION, state };
    localStorage.setItem(STATE_KEY, JSON.stringify(versioned));
  } catch {
    // ignore write errors
  }
}
