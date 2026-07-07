import { test, expect } from '@playwright/test';
import type { CreateLocationRequest, LocationDto } from './types';

function uniqueName(prefix = 'Station'): string {
  return `${prefix} ${crypto.randomUUID().replace(/-/g, '')}`;
}

function testLocation(overrides: Partial<CreateLocationRequest> = {}): CreateLocationRequest {
  return {
    name: uniqueName(),
    address: '1801 10th Ave NW, Issaquah, WA',
    latitude: 47.5301,
    longitude: -122.0326,
    ...overrides,
  };
}

test('CreateLocation_Returns201WithId', async ({ request }) => {
  const response = await request.post('/api/v1/locations', { data: testLocation() });

  expect(response.status()).toBe(201);
  const dto: LocationDto = await response.json();
  expect(dto.id).toBeGreaterThan(0);
  expect(dto.useCount).toBe(0);
  expect(dto.lastUsedAt).toBeFalsy();
});

test('GetLocation_AfterCreate_ReturnsExpectedFields', async ({ request }) => {
  const req = testLocation();
  const created: LocationDto = await (await request.post('/api/v1/locations', { data: req })).json();

  const response = await request.get(`/api/v1/locations/${created.id}`);

  expect(response.status()).toBe(200);
  const dto: LocationDto = await response.json();
  expect(dto.name).toBe(req.name);
  expect(dto.address).toBe(req.address);
  expect(dto.latitude).toBe(req.latitude);
  expect(dto.longitude).toBe(req.longitude);
});

test('GetNonExistentLocation_Returns404', async ({ request }) => {
  const response = await request.get('/api/v1/locations/999999999');
  expect(response.status()).toBe(404);
});

test('ListLocations_ContainsCreatedLocation', async ({ request }) => {
  const created: LocationDto = await (
    await request.post('/api/v1/locations', { data: testLocation() })
  ).json();

  const response = await request.get('/api/v1/locations');

  expect(response.status()).toBe(200);
  const list: LocationDto[] = await response.json();
  expect(list.some(l => l.id === created.id)).toBe(true);
});

test('ListLocations_FiltersBySearchAgainstNameOrAddress', async ({ request }) => {
  const tag = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const named: LocationDto = await (
    await request.post('/api/v1/locations', { data: testLocation({ name: `Costco-${tag}` }) })
  ).json();
  const addressed: LocationDto = await (
    await request.post('/api/v1/locations', {
      data: testLocation({ name: uniqueName(), address: `${tag} Pine St` }),
    })
  ).json();
  // A non-matching row, to make sure the filter narrows
  await request.post('/api/v1/locations', { data: testLocation() });

  const response = await request.get('/api/v1/locations', { params: { search: tag } });

  const list: LocationDto[] = await response.json();
  const ids = list.map(l => l.id);
  expect(ids).toContain(named.id);
  expect(ids).toContain(addressed.id);
});

test('ListLocations_OrderByName_SortsAlphabetically', async ({ request }) => {
  const tag = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await request.post('/api/v1/locations', { data: testLocation({ name: `Zeta-${tag}` }) });
  await request.post('/api/v1/locations', { data: testLocation({ name: `Alpha-${tag}` }) });
  await request.post('/api/v1/locations', { data: testLocation({ name: `Mid-${tag}` }) });

  const response = await request.get('/api/v1/locations', {
    params: { search: tag, orderBy: 'name', limit: 10 },
  });

  const list: LocationDto[] = await response.json();
  const tagged = list.filter(l => l.name.includes(tag)).map(l => l.name);
  expect(tagged).toEqual([`Alpha-${tag}`, `Mid-${tag}`, `Zeta-${tag}`]);
});

test('ListLocations_RespectsLimit', async ({ request }) => {
  const tag = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  for (let i = 0; i < 6; i++) {
    await request.post('/api/v1/locations', { data: testLocation({ name: `Station-${tag}-${i}` }) });
  }

  const response = await request.get('/api/v1/locations', { params: { search: tag, limit: 3 } });

  const list: LocationDto[] = await response.json();
  expect(list).toHaveLength(3);
});

test('CreateLocation_DuplicateNameAndAddress_ReturnsExistingId', async ({ request }) => {
  const req = testLocation();
  const first: LocationDto = await (await request.post('/api/v1/locations', { data: req })).json();

  const response = await request.post('/api/v1/locations', { data: req });

  expect(response.status()).toBe(201);
  const second: LocationDto = await response.json();
  expect(second.id).toBe(first.id);
});

test('CreateLocation_DuplicateNameCaseInsensitive_ReturnsExistingId', async ({ request }) => {
  const req = testLocation();
  const first: LocationDto = await (await request.post('/api/v1/locations', { data: req })).json();

  const response = await request.post('/api/v1/locations', {
    data: { ...req, name: req.name.toUpperCase() },
  });

  const second: LocationDto = await response.json();
  expect(second.id).toBe(first.id);
});

test('CreateLocation_TrimsWhitespaceOnNameAndAddress', async ({ request }) => {
  const name = uniqueName();
  const response = await request.post('/api/v1/locations', {
    data: { name: `  ${name}  `, address: '  123 Main St  ' },
  });

  const dto: LocationDto = await response.json();
  expect(dto.name).toBe(name);
  expect(dto.address).toBe('123 Main St');
});

test('CreateLocation_BackfillsCoordsOnExistingRowMissingThem', async ({ request }) => {
  const req: CreateLocationRequest = { name: uniqueName(), address: '999 Empty Ave' };
  const first: LocationDto = await (await request.post('/api/v1/locations', { data: req })).json();
  expect(first.latitude).toBeFalsy();

  await request.post('/api/v1/locations', {
    data: { ...req, latitude: 47.6, longitude: -122.3 },
  });

  const fetched: LocationDto = await (await request.get(`/api/v1/locations/${first.id}`)).json();
  expect(fetched.latitude).toBe(47.6);
  expect(fetched.longitude).toBe(-122.3);
});

test('CreateLocation_MissingName_Returns400', async ({ request }) => {
  const response = await request.post('/api/v1/locations', { data: { address: 'no name here' } });
  expect(response.status()).toBe(400);
});
