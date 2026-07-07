import { test, expect } from '@playwright/test';
import type { VehicleDto, CreateVehicleRequest, UpdateVehicleRequest } from './types';

function testVehicle(): CreateVehicleRequest {
  return {
    name: `Test Vehicle ${crypto.randomUUID().replace(/-/g, '')}`,
    year: 2024,
    make: 'Ford',
    model: 'Bronco',
    initialOdometer: 0,
    tankCapacityGallons: 20.8,
    startDate: '2024-01-01',
  };
}

test('CreateVehicle_Returns201WithId', async ({ request }) => {
  const response = await request.post('/api/v1/vehicles', { data: testVehicle() });

  expect(response.status()).toBe(201);
  const vehicle: VehicleDto = await response.json();
  expect(vehicle.id).toBeGreaterThan(0);

  await request.delete(`/api/v1/vehicles/${vehicle.id}`);
});

test('GetVehicle_AfterCreate_ReturnsExpectedFields', async ({ request }) => {
  const req = testVehicle();
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: req })).json();

  const response = await request.get(`/api/v1/vehicles/${created.id}`);

  expect(response.status()).toBe(200);
  const vehicle: VehicleDto = await response.json();
  expect(vehicle.name).toBe(req.name);
  expect(vehicle.year).toBe(req.year);
  expect(vehicle.make).toBe(req.make);
  expect(vehicle.model).toBe(req.model);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test('ListVehicles_ContainsCreatedVehicle', async ({ request }) => {
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: testVehicle() })).json();

  const response = await request.get('/api/v1/vehicles');

  expect(response.status()).toBe(200);
  const list: VehicleDto[] = await response.json();
  expect(list.some(v => v.id === created.id)).toBe(true);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test('UpdateVehicle_ReturnsUpdatedFields', async ({ request }) => {
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: testVehicle() })).json();

  const update: UpdateVehicleRequest = {
    name: 'Updated Name',
    year: 2025,
    make: 'Ford',
    model: 'Bronco',
  };
  const response = await request.put(`/api/v1/vehicles/${created.id}`, { data: update });

  expect(response.status()).toBe(200);
  const updated: VehicleDto = await response.json();
  expect(updated.name).toBe('Updated Name');
  expect(updated.year).toBe(2025);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test('DeleteVehicle_Returns204ThenNotFound', async ({ request }) => {
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: testVehicle() })).json();

  const deleteResponse = await request.delete(`/api/v1/vehicles/${created.id}`);
  expect(deleteResponse.status()).toBe(204);

  const getResponse = await request.get(`/api/v1/vehicles/${created.id}`);
  expect(getResponse.status()).toBe(404);
});

test('GetNonExistentVehicle_Returns404', async ({ request }) => {
  const response = await request.get('/api/v1/vehicles/999999999');
  expect(response.status()).toBe(404);
});

test('CreateVehicle_WithTankCapacity_RoundTrips', async ({ request }) => {
  const req = testVehicle();
  const response = await request.post('/api/v1/vehicles', { data: req });
  const vehicle: VehicleDto = await response.json();

  expect(vehicle.tankCapacityGallons).toBe(req.tankCapacityGallons);

  await request.delete(`/api/v1/vehicles/${vehicle.id}`);
});

test('UpdateVehicle_TankCapacity_IsUpdated', async ({ request }) => {
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: testVehicle() })).json();

  const update: UpdateVehicleRequest = {
    name: created.name,
    year: created.year,
    make: created.make,
    model: created.model,
    tankCapacityGallons: 16.9,
  };
  const response = await request.put(`/api/v1/vehicles/${created.id}`, { data: update });
  const updated: VehicleDto = await response.json();

  expect(updated.tankCapacityGallons).toBe(16.9);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});

test('ListVehicles_OnlyReturnsCurrentUsersVehicles', async ({ request }) => {
  const created: VehicleDto = await (await request.post('/api/v1/vehicles', { data: testVehicle() })).json();

  const list: VehicleDto[] = await (await request.get('/api/v1/vehicles')).json();

  expect(list.every(v => v.id > 0)).toBe(true);
  expect(list.some(v => v.id === created.id)).toBe(true);

  await request.delete(`/api/v1/vehicles/${created.id}`);
});
