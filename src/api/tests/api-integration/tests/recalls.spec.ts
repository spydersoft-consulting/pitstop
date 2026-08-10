import { test, expect } from "@playwright/test";
import type { VehicleDto, CreateVehicleRequest, RecallDto } from "./types";

// The WireMock mappings in wiremock/mappings/decode-vin-default.json stub any VIN's decode
// result as Ford/Bronco/2024, and recalls-by-vehicle.json stubs a single canned recall for
// that exact make/model/year -- see AppHost's Testing wiring for how the API is pointed at it.
const DECODABLE_VIN = "1FMEE5DP5NLA12345";
const UNDECODABLE_VIN = "ZZZUNDECADABLE001";

function testVehicle(overrides: Partial<CreateVehicleRequest> = {}): CreateVehicleRequest {
  return {
    name: `Test Vehicle ${crypto.randomUUID().replace(/-/g, "")}`,
    year: 2024,
    make: "Ford",
    model: "Bronco",
    initialOdometer: 0,
    startDate: "2024-01-01",
    ...overrides,
  };
}

test("GetRecalls_ReturnsRecalls_ForVehicleWithDecodableVin", async ({ request }) => {
  const created: VehicleDto = await (
    await request.post("/api/v1/vehicles", { data: testVehicle({ vin: DECODABLE_VIN }) })
  ).json();

  const response = await request.get(`/api/v1/vehicles/${created.id}/recalls`);

  expect(response.status()).toBe(200);
  const recalls: RecallDto[] = await response.json();
  expect(recalls).toHaveLength(1);
  expect(recalls[0].campaignNumber).toBe("24V123000");
  expect(recalls[0].component).toBe("STEERING");

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test("GetRecalls_ReturnsValidationProblem_WhenVehicleHasNoVin", async ({ request }) => {
  const created: VehicleDto = await (await request.post("/api/v1/vehicles", { data: testVehicle() })).json();

  const response = await request.get(`/api/v1/vehicles/${created.id}/recalls`);

  expect(response.status()).toBe(400);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test("GetRecalls_ReturnsValidationProblem_WhenVinCannotBeDecoded", async ({ request }) => {
  const created: VehicleDto = await (
    await request.post("/api/v1/vehicles", { data: testVehicle({ vin: UNDECODABLE_VIN }) })
  ).json();

  const response = await request.get(`/api/v1/vehicles/${created.id}/recalls`);

  expect(response.status()).toBe(400);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test("GetRecalls_ReturnsNotFound_ForNonexistentVehicle", async ({ request }) => {
  const response = await request.get("/api/v1/vehicles/999999999/recalls");
  expect(response.status()).toBe(404);
});
