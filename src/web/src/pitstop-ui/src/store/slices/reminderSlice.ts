import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { remindersApi } from "../../api/remindersApi";
import type {
  CompleteReminderRequest,
  ReminderDto,
  ReminderRequest,
  ReminderTemplateDto,
  SnoozeReminderRequest,
} from "../../api/generated/types.gen";

export type Reminder = ReminderDto;
export type ReminderTemplate = ReminderTemplateDto;

interface ReminderState {
  reminders: Reminder[];
  templates: ReminderTemplate[];
  loading: boolean;
}

const initialState: ReminderState = {
  reminders: [],
  templates: [],
  loading: false,
};

export const fetchReminders = createAsyncThunk("reminders/fetch", (vehicleId: number) => remindersApi.list(vehicleId));

export const fetchReminderTemplates = createAsyncThunk("reminders/fetchTemplates", () => remindersApi.templates());

export const createReminder = createAsyncThunk(
  "reminders/create",
  ({ vehicleId, body }: { vehicleId: number; body: ReminderRequest }) => remindersApi.create(vehicleId, body),
);

export const createRemindersFromTemplates = createAsyncThunk(
  "reminders/createFromTemplates",
  ({ vehicleId, serviceTypes }: { vehicleId: number; serviceTypes: string[] }) =>
    remindersApi.createFromTemplates(vehicleId, serviceTypes),
);

export const updateReminder = createAsyncThunk(
  "reminders/update",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: ReminderRequest }) =>
    remindersApi.update(vehicleId, id, body),
);

export const deleteReminder = createAsyncThunk(
  "reminders/delete",
  async ({ vehicleId, id }: { vehicleId: number; id: number }) => {
    await remindersApi.delete(vehicleId, id);
    return id;
  },
);

export const completeReminder = createAsyncThunk(
  "reminders/complete",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: CompleteReminderRequest }) =>
    remindersApi.complete(vehicleId, id, body),
);

export const snoozeReminder = createAsyncThunk(
  "reminders/snooze",
  ({ vehicleId, id, body }: { vehicleId: number; id: number; body: SnoozeReminderRequest }) =>
    remindersApi.snooze(vehicleId, id, body),
);

const replaceReminder = (state: ReminderState, updated: Reminder) => {
  const idx = state.reminders.findIndex((r) => r.id === updated.id);
  if (idx !== -1) state.reminders[idx] = updated;
};

const reminderSlice = createSlice({
  name: "reminders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReminders.pending, (state) => {
        state.loading = true;
        state.reminders = [];
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.loading = false;
        state.reminders = action.payload;
      })
      .addCase(fetchReminders.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchReminderTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        state.reminders.push(action.payload);
      })
      .addCase(createRemindersFromTemplates.fulfilled, (state, action) => {
        state.reminders.push(...action.payload);
      })
      .addCase(updateReminder.fulfilled, (state, action) => replaceReminder(state, action.payload))
      .addCase(completeReminder.fulfilled, (state, action) => replaceReminder(state, action.payload))
      .addCase(snoozeReminder.fulfilled, (state, action) => replaceReminder(state, action.payload))
      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter((r) => r.id !== action.payload);
      });
  },
});

export const reminderSliceReducer = reminderSlice.reducer;
