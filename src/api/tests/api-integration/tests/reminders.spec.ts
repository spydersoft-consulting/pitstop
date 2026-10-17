import { test, expect } from "@playwright/test";
import type { VehicleDto, ReminderDto, ReminderRequest, ReminderTemplateDto, MaintenanceLogListResponse } from "./types";

let vehicleId: number;

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/v1/vehicles", {
    data: {
      name: `Reminder Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
      year: 2024,
      make: "Ford",
      model: "Bronco",
      startDate: "2024-01-01",
      initialOdometer: 0,
    },
  });
  const vehicle: VehicleDto = await response.json();
  vehicleId = vehicle.id;
});

test.afterEach(async ({ request }) => {
  await request.delete(`/api/v1/vehicles/${vehicleId}`);
});

const oilReminder: ReminderRequest = {
  serviceType: "OilChange",
  intervalMiles: 5000,
  intervalMonths: 6,
  leadMiles: 500,
  leadDays: 14,
};

test("CreateReminder_Returns201WithComputedDueValues", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder });

  expect(response.status()).toBe(201);
  const dto: ReminderDto = await response.json();
  expect(dto.id).toBeGreaterThan(0);
  expect(dto.name).toBe("Oil change");
  expect(dto.source).toBe("User");
  expect(dto.nextDueOdometer).toBe(5000);
  expect(dto.nextDueDate).toBe("2024-07-01");
});

test("CreateReminder_WithoutInterval_Returns400", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, {
    data: { serviceType: "OilChange" },
  });

  expect(response.status()).toBe(400);
});

test("CreateReminder_ForUnknownVehicle_Returns404", async ({ request }) => {
  const response = await request.post("/api/v1/vehicles/999999999/reminders", { data: oilReminder });

  expect(response.status()).toBe(404);
});

test("GetReminders_UsesMaintenanceLogAsBaseline", async ({ request }) => {
  await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder });
  await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: {
      serviceDate: "2026-01-15",
      odometerReading: 30000,
      performedBy: "Self",
      items: [{ serviceType: "OilChange" }],
    },
  });

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/reminders`);

  expect(response.status()).toBe(200);
  const reminders: ReminderDto[] = await response.json();
  expect(reminders).toHaveLength(1);
  expect(reminders[0].lastServiceOdometer).toBe(30000);
  expect(reminders[0].nextDueOdometer).toBe(35000);
  expect(reminders[0].nextDueDate).toBe("2026-07-15");
});

test("CompleteReminder_AdvancesBaselineAndRecordsAMaintenanceLog", async ({ request }) => {
  const created: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder })
  ).json();

  const response = await request.post(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}/complete`, {
    data: { date: "2026-03-01", odometer: 42000 },
  });

  expect(response.status()).toBe(200);
  const dto: ReminderDto = await response.json();
  expect(dto.lastServiceOdometer).toBe(42000);
  expect(dto.nextDueOdometer).toBe(47000);

  const logs: MaintenanceLogListResponse = await (await request.get(`/api/v1/vehicles/${vehicleId}/maintenance`)).json();
  expect(logs.items).toHaveLength(1);
  expect(logs.items[0].serviceDate).toBe("2026-03-01");
  expect(logs.items[0].odometerReading).toBe(42000);
  expect(logs.items[0].items.map((i) => i.serviceType)).toEqual(["OilChange"]);
});

test("SnoozeReminder_SetsAndClearsSnooze", async ({ request }) => {
  const created: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder })
  ).json();

  const snoozed: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}/snooze`, {
      data: { until: "2099-01-01" },
    })
  ).json();
  const cleared: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}/snooze`, { data: {} })
  ).json();

  expect(snoozed.status).toBe("Snoozed");
  expect(cleared.snoozedUntil).toBeNull();
});

test("UpdateReminder_ChangesIntervals", async ({ request }) => {
  const created: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder })
  ).json();

  const response = await request.put(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}`, {
    data: { ...oilReminder, intervalMiles: 7500 },
  });

  expect(response.status()).toBe(200);
  const dto: ReminderDto = await response.json();
  expect(dto.intervalMiles).toBe(7500);
  expect(dto.nextDueOdometer).toBe(7500);
});

test("DeleteReminder_RemovesIt", async ({ request }) => {
  const created: ReminderDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/reminders`, { data: oilReminder })
  ).json();

  const deleteResponse = await request.delete(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}`);
  const getResponse = await request.get(`/api/v1/vehicles/${vehicleId}/reminders/${created.id}`);

  expect(deleteResponse.status()).toBe(204);
  expect(getResponse.status()).toBe(404);
});

test("GetReminderTemplates_ReturnsLibrary", async ({ request }) => {
  const response = await request.get("/api/v1/reminder-templates");

  expect(response.status()).toBe(200);
  const templates: ReminderTemplateDto[] = await response.json();
  expect(templates.map((t) => t.serviceType)).toContain("OilChange");
});

test("CreateRemindersFromTemplates_CreatesTemplateSourcedReminders", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/reminders/from-templates`, {
    data: { serviceTypes: ["OilChange", "TireRotation"] },
  });

  expect(response.status()).toBe(200);
  const reminders: ReminderDto[] = await response.json();
  expect(reminders.map((r) => r.serviceType).sort()).toEqual(["OilChange", "TireRotation"]);
  expect(reminders.every((r) => r.source === "Template")).toBe(true);
});
