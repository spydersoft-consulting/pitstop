import { test, expect } from "@playwright/test";
import type {
  VehicleDto,
  MaintenanceLogDto,
  CreateMaintenanceLogRequest,
  UpdateMaintenanceLogRequest,
  MaintenanceLogListResponse,
  LocationDto,
  CreateLocationRequest,
} from "./types";

let vehicleId: number;

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/v1/vehicles", {
    data: {
      name: `Maintenance Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
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

function testLog(odometer: number, overrides: Partial<CreateMaintenanceLogRequest> = {}): CreateMaintenanceLogRequest {
  return {
    serviceDate: "2026-01-15",
    odometerReading: odometer,
    serviceType: "OilChange",
    performedBy: "Self",
    ...overrides,
  };
}

test("CreateMaintenanceLog_Returns201", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(1000),
  });

  expect(response.status()).toBe(201);
  const dto: MaintenanceLogDto = await response.json();
  expect(dto.id).toBeGreaterThan(0);
  expect(dto.vehicleId).toBe(vehicleId);
  expect(dto.serviceType).toBe("OilChange");
  expect(dto.performedBy).toBe("Self");
});

test("GetMaintenanceLog_ById_ReturnsExpectedFields", async ({ request }) => {
  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(2000) })
  ).json();

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`);

  expect(response.status()).toBe(200);
  const dto: MaintenanceLogDto = await response.json();
  expect(dto.id).toBe(created.id);
  expect(dto.odometerReading).toBe(2000);
});

test("GetMaintenanceLog_NotFound_Returns404", async ({ request }) => {
  const response = await request.get(`/api/v1/vehicles/${vehicleId}/maintenance/999999999`);
  expect(response.status()).toBe(404);
});

test("ListMaintenanceLogs_ReturnsPaginatedResults", async ({ request }) => {
  for (let i = 0; i < 3; i++) {
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(3000 + i * 200) });
  }

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    params: { pageSize: 2, page: 1 },
  });

  expect(response.status()).toBe(200);
  const list: MaintenanceLogListResponse = await response.json();
  expect(list.items).toHaveLength(2);
  expect(list.totalCount).toBeGreaterThanOrEqual(3);
});

test("ListMaintenanceLogs_FiltersByServiceType", async ({ request }) => {
  await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(4000, { serviceType: "OilChange" }),
  });
  await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(4100, { serviceType: "TireRotation" }),
  });

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    params: { serviceType: "TireRotation" },
  });

  expect(response.status()).toBe(200);
  const list: MaintenanceLogListResponse = await response.json();
  expect(list.items.every((i) => i.serviceType === "TireRotation")).toBe(true);
  expect(list.items.length).toBeGreaterThanOrEqual(1);
});

test("ListMaintenanceLogs_SortByOdometer", async ({ request }) => {
  const tagLow = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(5000) })
  ).json();
  const tagHigh = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(5500) })
  ).json();

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    params: { sortBy: "odometer", order: "asc", pageSize: 100 },
  });

  const list: MaintenanceLogListResponse = await response.json();
  const idxLow = list.items.findIndex((i) => i.id === tagLow.id);
  const idxHigh = list.items.findIndex((i) => i.id === tagHigh.id);
  expect(idxLow).toBeLessThan(idxHigh);
});

test("UpdateMaintenanceLog_ReturnsUpdatedOdometer", async ({ request }) => {
  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(6000) })
  ).json();

  const update: UpdateMaintenanceLogRequest = {
    serviceDate: created.serviceDate,
    odometerReading: 6100,
    serviceType: "OilChange",
    performedBy: "Self",
  };
  const response = await request.put(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`, { data: update });

  expect(response.status()).toBe(200);
  const updated: MaintenanceLogDto = await response.json();
  expect(updated.odometerReading).toBe(6100);
});

test("DeleteMaintenanceLog_Returns204ThenNotFound", async ({ request }) => {
  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, { data: testLog(7000) })
  ).json();

  expect((await request.delete(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`)).status()).toBe(204);
  expect((await request.get(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`)).status()).toBe(404);
});

test("CreateMaintenanceLog_InvalidServiceType_Returns400", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(8000, { serviceType: "NotAType" }),
  });

  expect(response.status()).toBe(400);
});

test("CreateMaintenanceLog_InvalidPerformedBy_Returns400", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(8100, { performedBy: "Nobody" }),
  });

  expect(response.status()).toBe(400);
});

test("CreateMaintenanceLog_ComputedTotalCost_SumsPartsAndLabor", async ({ request }) => {
  const dto: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(8500, { partsCost: 20, laborCost: 15 }),
    })
  ).json();

  expect(dto.computedTotalCost).toBe(35);
});

test("CreateMaintenanceLog_ComputedTotalCost_PrefersExplicitTotal", async ({ request }) => {
  const dto: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(8600, { partsCost: 20, laborCost: 15, totalCost: 50 }),
    })
  ).json();

  expect(dto.computedTotalCost).toBe(50);
});

function uniqueName(prefix = "Maint-Loc"): string {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

async function createLocation(
  request: import("@playwright/test").APIRequestContext,
  overrides: Partial<CreateLocationRequest> = {},
): Promise<LocationDto> {
  const response = await request.post("/api/v1/locations", {
    data: { name: uniqueName(), ...overrides },
  });
  return response.json();
}

test("CreateMaintenanceLog_WithLocationId_AttachesAndIncrementsUseCount", async ({ request }) => {
  const loc = await createLocation(request);
  expect(loc.useCount).toBe(0);

  const dto: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(9000, { locationId: loc.id, serviceType: "BrakePads", performedBy: "Shop" }),
    })
  ).json();

  expect(dto.location).not.toBeNull();
  expect(dto.location!.id).toBe(loc.id);

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${loc.id}`)).json();
  expect(refreshed.useCount).toBe(1);
  expect(refreshed.lastUsedAt).toBeTruthy();
});

test("CreateMaintenanceLog_WithInlineLocation_CreatesAndAttaches", async ({ request }) => {
  const name = uniqueName("Inline");

  const dto: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(9500, { location: { name, address: "500 Pine St" } }),
    })
  ).json();

  expect(dto.location).not.toBeNull();
  expect(dto.location!.name).toBe(name);

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${dto.location!.id}`)).json();
  expect(refreshed.useCount).toBe(1);
});

test("CreateMaintenanceLog_WithBothLocationIdAndInlineLocation_Returns400", async ({ request }) => {
  const loc = await createLocation(request);

  const response = await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(10000, { locationId: loc.id, location: { name: "Other" } }),
  });

  expect(response.status()).toBe(400);
});

test("CreateMaintenanceLog_WithUnknownLocationId_Returns400", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
    data: testLog(10500, { locationId: 999999999 }),
  });

  expect(response.status()).toBe(400);
});

test("UpdateMaintenanceLog_ChangingLocation_MovesUsageCount", async ({ request }) => {
  const oldLoc = await createLocation(request);
  const newLoc = await createLocation(request);

  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(11000, { locationId: oldLoc.id }),
    })
  ).json();

  const update: UpdateMaintenanceLogRequest = {
    serviceDate: created.serviceDate,
    odometerReading: 11000,
    serviceType: "OilChange",
    performedBy: "Shop",
    locationId: newLoc.id,
  };
  await request.put(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`, { data: update });

  const oldRefreshed: LocationDto = await (await request.get(`/api/v1/locations/${oldLoc.id}`)).json();
  const newRefreshed: LocationDto = await (await request.get(`/api/v1/locations/${newLoc.id}`)).json();
  expect(oldRefreshed.useCount).toBe(0);
  expect(newRefreshed.useCount).toBe(1);
});

test("DeleteMaintenanceLog_DecrementsLocationUseCount", async ({ request }) => {
  const loc = await createLocation(request);

  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/maintenance`, {
      data: testLog(12000, { locationId: loc.id }),
    })
  ).json();

  await request.delete(`/api/v1/vehicles/${vehicleId}/maintenance/${created.id}`);

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${loc.id}`)).json();
  expect(refreshed.useCount).toBe(0);
});

test("DeleteVehicle_HidesItsMaintenanceLogs", async ({ request }) => {
  // Vehicle deletion is a soft-delete (IsDeleted flag), not a hard DB delete, so this
  // exercises the query filter chain (MaintenanceLog filters on !Vehicle.IsDeleted),
  // not the FK cascade behavior configured in MaintenanceLogConfiguration.
  const vehicleResponse = await request.post("/api/v1/vehicles", {
    data: {
      name: `Cascade Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
      year: 2024,
      make: "Ford",
      model: "Bronco",
      startDate: "2024-01-01",
    },
  });
  const vehicle: VehicleDto = await vehicleResponse.json();

  const created: MaintenanceLogDto = await (
    await request.post(`/api/v1/vehicles/${vehicle.id}/maintenance`, { data: testLog(13000) })
  ).json();

  expect((await request.delete(`/api/v1/vehicles/${vehicle.id}`)).status()).toBe(204);
  expect((await request.get(`/api/v1/vehicles/${vehicle.id}/maintenance/${created.id}`)).status()).toBe(404);
});
