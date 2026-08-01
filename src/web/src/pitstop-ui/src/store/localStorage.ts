import type { RootState } from "./store";

const STATE_KEY = "pitstop_state";
const STATE_VERSION = 6;

interface VersionedState {
  version: number;
  state: Partial<RootState>;
}

const isObjectWithId = (x: unknown): boolean =>
  typeof x === "object" && x !== null && "id" in (x as Record<string, unknown>);

const isValidIdArray = (value: unknown): boolean => Array.isArray(value) && value.every(isObjectWithId);

function isValidState(state: Partial<RootState>): boolean {
  if (state.vehicles !== undefined && !isValidIdArray(state.vehicles.vehicles)) return false;
  if (state.fillUps !== undefined && !isValidIdArray(state.fillUps.recentFillUps)) return false;
  if (state.locations !== undefined && !isValidIdArray(state.locations.locations)) return false;
  if (state.maintenanceLogs !== undefined && !isValidIdArray(state.maintenanceLogs.recentMaintenanceLogs)) return false;
  return true;
}

export function loadState(): Partial<RootState> | undefined {
  try {
    const serialized = localStorage.getItem(STATE_KEY);
    if (!serialized) return undefined;
    const parsed = JSON.parse(serialized) as VersionedState | Partial<RootState>;
    if (!("version" in parsed) || parsed.version !== STATE_VERSION) return undefined;
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
