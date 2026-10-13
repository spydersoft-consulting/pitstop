import { test, expect, type APIRequestContext } from "@playwright/test";
import type { VehicleDto, SummaryResponse, MpgOverTimeResponse, SpendResponse, MaintenanceCostResponse } from "./types";

let vehicleId: number;

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/v1/vehicles", {
    data: {
      name: `Analytics Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
      year: 2024,
      make: "Ford",
      model: "Bronco",
      startDate: "2024-01-01",
    },
  });
  const vehicle: VehicleDto = await response.json();
  vehicleId = vehicle.id;
});

test.afterEach(async ({ request }) => {
  await request.delete(`/api/v1/vehicles/${vehicleId}`);
});

async function addFillUp(request: APIRequestContext, odometer: number, gallons: number): Promise<void> {
  await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
    data: {
      odometerReading: odometer,
      gallonsAdded: gallons,
      pricePerGallon: 3.5,
      totalCost: Math.round(gallons * 3.5 * 100) / 100,
      isFullFillUp: true,
    },
  });
}

test("Summary_NoFillUps_ReturnsEmptyResponse", async ({ request }) => {
  const response = await request.get(`/api/v1/vehicles/${vehicleId}/analytics/summary`);

  expect(response.status()).toBe(200);
  const summary: SummaryResponse = await response.json();
  expect(summary.totalFillUps).toBe(0);
  expect(summary.totalGallons).toBe(0);
  expect(summary.totalSpend).toBe(0);
});

test("Summary_WithFillUps_ReturnsAggregates", async ({ request }) => {
  await addFillUp(request, 1000, 12.0);
  await addFillUp(request, 1220, 11.0);
  await addFillUp(request, 1460, 12.0);

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/analytics/summary`);

  expect(response.status()).toBe(200);
  const summary: SummaryResponse = await response.json();
  expect(summary.totalFillUps).toBe(3);
  expect(summary.totalGallons).toBeGreaterThan(0);
  expect(summary.totalSpend).toBeGreaterThan(0);
  expect(summary.totalMiles).toBeGreaterThan(0);
  expect(summary.overallMpg).not.toBeNull();
});

test("MpgOverTime_WithFillUps_ReturnsDataPoints", async ({ request }) => {
  await addFillUp(request, 2000, 12.0);
  await addFillUp(request, 2200, 11.5);

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/analytics/mpg`);

  expect(response.status()).toBe(200);
  const result: MpgOverTimeResponse = await response.json();
  expect(result.points.length).toBeGreaterThan(0);
  expect(result.points.every((p) => p.mpg !== undefined)).toBe(true);
});

test("Spend_WithFillUps_ReturnsMonthlyBreakdown", async ({ request }) => {
  await addFillUp(request, 3000, 12.0);
  await addFillUp(request, 3220, 11.5);

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/analytics/spend`);

  expect(response.status()).toBe(200);
  const result: SpendResponse = await response.json();
  expect(result.points.length).toBeGreaterThan(0);
  expect(result.points.every((p) => p.totalSpend > 0 && p.fillUpCount > 0)).toBe(true);
});

test("MaintenanceCost_GroupsItemsByServiceType", async ({ request }) => {
  const visit = (odometer: number, date: string, items: object[]) =>
    request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: { serviceDate: date, odometerReading: odometer, performedBy: "Shop", items },
    });
  await visit(1000, "2026-01-10", [
    { serviceType: "OilChange", partsCost: 30, laborCost: 20 },
    { serviceType: "TireRotation", totalCost: 25 },
    { serviceType: "Recall", isWarrantyWork: true },
  ]);
  await visit(6000, "2026-06-10", [{ serviceType: "OilChange", totalCost: 60 }]);

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/analytics/maintenance-cost`);

  expect(response.status()).toBe(200);
  const result: MaintenanceCostResponse = await response.json();
  const oil = result.points.find((p) => p.serviceType === "OilChange")!;
  expect(oil.count).toBe(2);
  expect(oil.totalCost).toBe(110);
  const recall = result.points.find((p) => p.serviceType === "Recall")!;
  expect(recall.warrantyCount).toBe(1);
  expect(result.points[0].serviceType).toBe("OilChange");

  const ranged: MaintenanceCostResponse = await (
    await request.get(`/api/v1/vehicles/${vehicleId}/analytics/maintenance-cost`, {
      params: { startDate: "2026-03-01", endDate: "2026-12-31" },
    })
  ).json();
  expect(ranged.points).toHaveLength(1);
  expect(ranged.points[0].totalCost).toBe(60);
});

test("Analytics_NonExistentVehicle_Returns404", async ({ request }) => {
  expect((await request.get("/api/v1/vehicles/999999999/analytics/summary")).status()).toBe(404);
  expect((await request.get("/api/v1/vehicles/999999999/analytics/mpg")).status()).toBe(404);
  expect((await request.get("/api/v1/vehicles/999999999/analytics/spend")).status()).toBe(404);
  expect((await request.get("/api/v1/vehicles/999999999/analytics/maintenance-cost")).status()).toBe(404);
});
