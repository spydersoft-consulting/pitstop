import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  reminderSliceReducer,
  fetchReminders,
  fetchReminderTemplates,
  createReminder,
  createRemindersFromTemplates,
  updateReminder,
  deleteReminder,
  completeReminder,
  snoozeReminder,
  type Reminder,
} from "./reminderSlice";

vi.mock("../../api/remindersApi", () => ({
  remindersApi: {
    list: vi.fn(),
    templates: vi.fn(),
    create: vi.fn(),
    createFromTemplates: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    snooze: vi.fn(),
  },
}));

import { remindersApi } from "../../api/remindersApi";

const r = (id: number, overrides: Partial<Reminder> = {}): Reminder => ({
  id,
  vehicleId: 1,
  serviceType: "OilChange",
  name: `Reminder ${id}`,
  intervalMiles: 5000,
  status: "Ok",
  ...overrides,
});

function makeStore() {
  return configureStore({ reducer: { reminders: reminderSliceReducer } });
}

describe("reminderSlice thunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchReminders populates reminders and clears loading", async () => {
    vi.mocked(remindersApi.list).mockResolvedValue([r(1), r(2)]);
    const store = makeStore();

    const pending = store.dispatch(fetchReminders(1));
    expect(store.getState().reminders.loading).toBe(true);
    await pending;

    expect(remindersApi.list).toHaveBeenCalledWith(1);
    expect(store.getState().reminders.loading).toBe(false);
    expect(store.getState().reminders.reminders.map((x) => x.id)).toEqual([1, 2]);
  });

  it("fetchReminders clears loading when the request fails", async () => {
    vi.mocked(remindersApi.list).mockRejectedValue(new Error("boom"));
    const store = makeStore();

    await store.dispatch(fetchReminders(1));

    expect(store.getState().reminders.loading).toBe(false);
    expect(store.getState().reminders.reminders).toEqual([]);
  });

  it("fetchReminderTemplates stores the template list", async () => {
    vi.mocked(remindersApi.templates).mockResolvedValue([{ serviceType: "OilChange", name: "Oil change" }]);
    const store = makeStore();

    await store.dispatch(fetchReminderTemplates());

    expect(store.getState().reminders.templates).toHaveLength(1);
  });

  it("createReminder appends the new reminder", async () => {
    vi.mocked(remindersApi.create).mockResolvedValue(r(3));
    const store = makeStore();

    await store.dispatch(createReminder({ vehicleId: 1, body: { serviceType: "OilChange", intervalMiles: 5000 } }));

    expect(store.getState().reminders.reminders.map((x) => x.id)).toEqual([3]);
  });

  it("createRemindersFromTemplates appends every created reminder", async () => {
    vi.mocked(remindersApi.createFromTemplates).mockResolvedValue([r(4), r(5)]);
    const store = makeStore();

    await store.dispatch(createRemindersFromTemplates({ vehicleId: 1, serviceTypes: ["OilChange", "TireRotation"] }));

    expect(remindersApi.createFromTemplates).toHaveBeenCalledWith(1, ["OilChange", "TireRotation"]);
    expect(store.getState().reminders.reminders.map((x) => x.id)).toEqual([4, 5]);
  });

  it.each([
    [
      "updateReminder",
      "update",
      (store: ReturnType<typeof makeStore>) =>
        store.dispatch(updateReminder({ vehicleId: 1, id: 1, body: { serviceType: "OilChange" } })),
    ],
    [
      "completeReminder",
      "complete",
      (store: ReturnType<typeof makeStore>) =>
        store.dispatch(completeReminder({ vehicleId: 1, id: 1, body: { date: "2026-06-01", odometer: 9 } })),
    ],
    [
      "snoozeReminder",
      "snooze",
      (store: ReturnType<typeof makeStore>) =>
        store.dispatch(snoozeReminder({ vehicleId: 1, id: 1, body: { until: "2026-07-01" } })),
    ],
  ] as const)("%s replaces the matching reminder in place", async (_name, apiMethod, run) => {
    vi.mocked(remindersApi[apiMethod]).mockResolvedValue(r(1, { status: "Overdue" }));
    vi.mocked(remindersApi.list).mockResolvedValue([r(1), r(2)]);
    const store = makeStore();
    await store.dispatch(fetchReminders(1));

    await run(store);

    const reminders = store.getState().reminders.reminders;
    expect(reminders.map((x) => x.id)).toEqual([1, 2]);
    expect(reminders[0].status).toBe("Overdue");
    expect(reminders[1].status).toBe("Ok");
  });

  it("deleteReminder removes the reminder", async () => {
    vi.mocked(remindersApi.list).mockResolvedValue([r(1), r(2)]);
    vi.mocked(remindersApi.delete).mockResolvedValue();
    const store = makeStore();
    await store.dispatch(fetchReminders(1));

    await store.dispatch(deleteReminder({ vehicleId: 1, id: 1 }));

    expect(store.getState().reminders.reminders.map((x) => x.id)).toEqual([2]);
  });
});
