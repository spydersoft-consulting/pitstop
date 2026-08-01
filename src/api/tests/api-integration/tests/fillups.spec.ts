import { test, expect } from "@playwright/test";
import type {
  VehicleDto,
  FillUpDto,
  CreateFillUpRequest,
  FillUpRequest,
  FillUpListResponse,
  LocationDto,
} from "./types";
import { uniqueName, createLocation } from "./location-helpers";

let vehicleId: number;

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/v1/vehicles", {
    data: {
      name: `FillUp Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
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

function testFillUp(odometer: number): CreateFillUpRequest {
  return {
    odometerReading: odometer,
    gallonsAdded: 12.0,
    pricePerGallon: 3.5,
    totalCost: 42.0,
    isFullFillUp: true,
  };
}

test("CreateFillUp_Returns201WithComputedFields", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
    data: testFillUp(1000),
  });

  expect(response.status()).toBe(201);
  const dto: FillUpDto = await response.json();
  expect(dto.id).toBeGreaterThan(0);
  expect(dto.vehicleId).toBe(vehicleId);
});

test("TwoFillUps_SecondHasMilesAndMpg", async ({ request }) => {
  await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(1000) });

  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(1240) });

  const dto: FillUpDto = await response.json();
  expect(dto.milesSinceLastFillUp).toBe(240);
  expect(dto.mpgThisFillUp).not.toBeNull(); // 240 / 12.0 = 20
});

test("GetFillUp_ById_ReturnsExpectedFields", async ({ request }) => {
  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(2000) })
  ).json();

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`);

  expect(response.status()).toBe(200);
  const dto: FillUpDto = await response.json();
  expect(dto.id).toBe(created.id);
  expect(dto.odometerReading).toBe(2000);
});

test("ListFillUps_ReturnsPaginatedResults", async ({ request }) => {
  for (let i = 0; i < 3; i++) {
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(3000 + i * 200) });
  }

  const response = await request.get(`/api/v1/vehicles/${vehicleId}/fillups`, {
    params: { pageSize: 2, page: 1 },
  });

  expect(response.status()).toBe(200);
  const list: FillUpListResponse = await response.json();
  expect(list.items).toHaveLength(2);
  expect(list.totalCount).toBeGreaterThanOrEqual(3);
});

test("UpdateFillUp_ReturnsUpdatedOdometer", async ({ request }) => {
  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(5000) })
  ).json();

  const update: FillUpRequest = {
    filledAt: created.filledAt,
    odometerReading: 5100,
    gallonsAdded: 12.0,
    pricePerGallon: 3.5,
    totalCost: 42.0,
    isFullFillUp: true,
  };
  const response = await request.put(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`, { data: update });

  expect(response.status()).toBe(200);
  const updated: FillUpDto = await response.json();
  expect(updated.odometerReading).toBe(5100);
});

test("DeleteFillUp_Returns204ThenNotFound", async ({ request }) => {
  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(9000) })
  ).json();

  expect((await request.delete(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`)).status()).toBe(204);
  expect((await request.get(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`)).status()).toBe(404);
});

test("CreateFillUp_FuelGrade_DefaultsMidGrade", async ({ request }) => {
  const dto: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: testFillUp(10000) })
  ).json();

  expect(dto.fuelGrade).toBe("MidGrade");
});

test("CreateFillUp_ExplicitFuelGrade_IsStored", async ({ request }) => {
  const req: CreateFillUpRequest = { ...testFillUp(11000), fuelGrade: "Premium" };
  const dto: FillUpDto = await (await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: req })).json();

  expect(dto.fuelGrade).toBe("Premium");
});

test("CreateFillUp_OnlyTotalCost_DerivesPricePerGallon", async ({ request }) => {
  const req: CreateFillUpRequest = {
    odometerReading: 12000,
    gallonsAdded: 10.0,
    totalCost: 35.0,
  };
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: req });

  expect(response.status()).toBe(201);
  const dto: FillUpDto = await response.json();
  expect(dto.pricePerGallon).toBe(3.5);
  expect(dto.totalCost).toBe(35.0);
});

test("CreateFillUp_OnlyPricePerGallon_DerivesTotalCost", async ({ request }) => {
  const req: CreateFillUpRequest = {
    odometerReading: 13000,
    gallonsAdded: 10.0,
    pricePerGallon: 3.5,
  };
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: req });

  expect(response.status()).toBe(201);
  const dto: FillUpDto = await response.json();
  expect(dto.pricePerGallon).toBe(3.5);
  expect(dto.totalCost).toBe(35.0);
});

test("CreateFillUp_NoCostFields_Returns400", async ({ request }) => {
  const req: CreateFillUpRequest = {
    odometerReading: 14000,
    gallonsAdded: 10.0,
  };
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, { data: req });

  expect(response.status()).toBe(400);
});

test("CreateFillUp_WithLocationId_AttachesLocation", async ({ request }) => {
  const loc = await createLocation(request);

  const dto: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: { ...testFillUp(15000), locationId: loc.id },
    })
  ).json();

  expect(dto.location).not.toBeNull();
  expect(dto.location!.id).toBe(loc.id);
  expect(dto.location!.name).toBe(loc.name);
});

test("CreateFillUp_WithLocationId_IncrementsUseCount", async ({ request }) => {
  const loc = await createLocation(request);
  expect(loc.useCount).toBe(0);

  await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
    data: { ...testFillUp(15500), locationId: loc.id },
  });

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${loc.id}`)).json();
  expect(refreshed.useCount).toBe(1);
  expect(refreshed.lastUsedAt).toBeTruthy();
});

test("CreateFillUp_WithInlineLocation_CreatesAndAttaches", async ({ request }) => {
  const name = uniqueName("Inline");

  const dto: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: {
        ...testFillUp(16000),
        location: { name, address: "500 Pine St" },
      },
    })
  ).json();

  expect(dto.location).not.toBeNull();
  expect(dto.location!.name).toBe(name);

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${dto.location!.id}`)).json();
  expect(refreshed.useCount).toBe(1);
});

test("CreateFillUp_WithInlineLocationMatchingExisting_ReusesExisting", async ({ request }) => {
  const loc = await createLocation(request, { address: "700 Reuse Ave" });

  const dto: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: {
        ...testFillUp(16500),
        location: { name: loc.name, address: "700 Reuse Ave" },
      },
    })
  ).json();

  expect(dto.location!.id).toBe(loc.id);
});

test("CreateFillUp_WithBothLocationIdAndInlineLocation_Returns400", async ({ request }) => {
  const loc = await createLocation(request);

  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
    data: {
      ...testFillUp(17000),
      locationId: loc.id,
      location: { name: "Other" },
    },
  });

  expect(response.status()).toBe(400);
});

test("CreateFillUp_WithUnknownLocationId_Returns400", async ({ request }) => {
  const response = await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
    data: { ...testFillUp(17500), locationId: 999999999 },
  });

  expect(response.status()).toBe(400);
});

test("UpdateFillUp_ChangingLocation_MovesUsageCount", async ({ request }) => {
  const oldLoc = await createLocation(request);
  const newLoc = await createLocation(request);

  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: { ...testFillUp(18000), locationId: oldLoc.id },
    })
  ).json();

  const update: FillUpRequest = {
    filledAt: created.filledAt,
    odometerReading: 18000,
    gallonsAdded: 12.0,
    pricePerGallon: 3.5,
    totalCost: 42.0,
    isFullFillUp: true,
    locationId: newLoc.id,
  };
  await request.put(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`, { data: update });

  const oldRefreshed: LocationDto = await (await request.get(`/api/v1/locations/${oldLoc.id}`)).json();
  const newRefreshed: LocationDto = await (await request.get(`/api/v1/locations/${newLoc.id}`)).json();
  expect(oldRefreshed.useCount).toBe(0);
  expect(newRefreshed.useCount).toBe(1);
});

test("DeleteFillUp_DecrementsLocationUseCount", async ({ request }) => {
  const loc = await createLocation(request);

  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: { ...testFillUp(19000), locationId: loc.id },
    })
  ).json();

  await request.delete(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`);

  const refreshed: LocationDto = await (await request.get(`/api/v1/locations/${loc.id}`)).json();
  expect(refreshed.useCount).toBe(0);
});

test("GetFillUp_AfterCreate_EmbedsLocationSummary", async ({ request }) => {
  const loc = await createLocation(request, { address: "800 Summary Ln" });

  const created: FillUpDto = await (
    await request.post(`/api/v1/vehicles/${vehicleId}/fillups`, {
      data: { ...testFillUp(19500), locationId: loc.id },
    })
  ).json();

  const fetched: FillUpDto = await (await request.get(`/api/v1/vehicles/${vehicleId}/fillups/${created.id}`)).json();

  expect(fetched.location).not.toBeNull();
  expect(fetched.location!.id).toBe(loc.id);
  expect(fetched.location!.address).toBe("800 Summary Ln");
});
