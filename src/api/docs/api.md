# API Reference

Base path: `/api/v1`

## Authentication

All endpoints require a JWT Bearer token issued by `https://auth.mattgerega.net`.

```
Authorization: Bearer <token>
```

### Scopes

| Scope           | Grants access to                |
| --------------- | ------------------------------- |
| `pitstop:read`  | All GET endpoints               |
| `pitstop:write` | All POST, PUT, DELETE endpoints |

OIDC discovery: `https://auth.mattgerega.net/.well-known/openid-configuration`  
Audience: `data-api`

### Data isolation

All data is scoped to the authenticated user via the JWT `sub` claim. Requests for resources owned by another user return `404` rather than `403` to avoid leaking existence.

---

## Vehicles

### GET /vehicles

List all vehicles for the current user.

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Bronco",
    "year": 2022,
    "make": "Ford",
    "model": "Bronco",
    "trim": "Outer Banks",
    "initialOdometer": 0,
    "tankCapacityGallons": 20.8,
    "startDate": "2024-01-01"
  }
]
```

### GET /vehicles/{id}

**Response** `200 OK` — vehicle object, or `404` if not found / not owned by caller.

### POST /vehicles

**Request body**

```json
{
  "name": "Bronco",
  "year": 2022,
  "make": "Ford",
  "model": "Bronco",
  "trim": "Outer Banks",
  "initialOdometer": 0.0,
  "tankCapacityGallons": 20.8,
  "startDate": "2024-01-01"
}
```

**Response** `201 Created` with `Location` header.

### PUT /vehicles/{id}

Same body as POST (name, year, make, model, trim, tankCapacityGallons). `startDate` and `initialOdometer` are not updatable after creation.

**Response** `200 OK` or `404`.

### DELETE /vehicles/{id}

Soft-deletes the vehicle.

**Response** `204 No Content` or `404`.

---

## Recalls

### GET /vehicles/{vehicleId}/recalls

Looks up open NHTSA recalls for a vehicle by its VIN. Requires the vehicle to have a `vin` on file.

Two NHTSA services are chained:

1. The VIN is decoded via [vPIC](https://vpic.nhtsa.dot.gov/api/) (`DecodeVinValues`) to get its make, model, and model year.
2. Those decoded values are used to query the [recalls API](https://api.nhtsa.gov/) (`recallsByVehicle`), since NHTSA's recall search has no VIN parameter.

Both steps are cached server-side: VIN decode results per VIN (default 30 days, configurable via `Nhtsa:VinDecodeCacheDurationMinutes` — a VIN's make/model/year never changes), and recall results per make/model/year (default 24 hours, configurable via `Nhtsa:CacheDurationMinutes` — recall data changes infrequently).

**Response** `200 OK`

```json
[
  {
    "campaignNumber": "22V123000",
    "manufacturer": "American Honda Motor Co.",
    "component": "STEERING",
    "summary": "Description of the defect.",
    "consequence": "Description of the safety risk.",
    "remedy": "Description of the free repair.",
    "notes": null,
    "parkIt": false,
    "parkOutside": false
  }
]
```

**Errors**

- `404` — vehicle doesn't exist or isn't owned by the caller
- `400` — vehicle has no VIN on file, or the VIN could not be decoded
- `502` — the vPIC or recalls service is unavailable

---

## Fill-Ups

### GET /vehicles/{vehicleId}/fillups

Paginated fill-up history for a vehicle.

**Query parameters**

| Parameter  | Type   | Default    | Description                  |
| ---------- | ------ | ---------- | ---------------------------- |
| `page`     | int    | 1          | Page number                  |
| `pageSize` | int    | 20         | Page size (max 100)          |
| `from`     | date   | —          | Filter from date (inclusive) |
| `to`       | date   | —          | Filter to date (inclusive)   |
| `orderBy`  | string | `filledAt` | `filledAt` or `odometer`     |
| `order`    | string | `desc`     | `asc` or `desc`              |

**Response** `200 OK`

```json
{
  "items": [/* fill-up objects */],
  "totalCount": 47,
  "page": 1,
  "pageSize": 20
}
```

### GET /vehicles/{vehicleId}/fillups/{id}

**Response** `200 OK` or `404`.

### POST /vehicles/{vehicleId}/fillups

**Request body**

```json
{
  "filledAt": "2025-04-28T14:30:00-07:00",
  "odometerReading": 18542.3,
  "gallonsAdded": 14.7,
  "pricePerGallon": 3.459,
  "totalCost": 50.85,
  "isFullFillUp": true,
  "fuelGrade": "MidGrade",
  "stationName": "Costco Gas",
  "stationAddress": "123 Main St",
  "latitude": 47.6062,
  "longitude": -122.3321,
  "notes": ""
}
```

`pricePerGallon` and `totalCost` are both optional but at least one must be present:

- If only `totalCost`: `pricePerGallon = totalCost / gallonsAdded`
- If only `pricePerGallon`: `totalCost = pricePerGallon * gallonsAdded`
- If both: stored as-is

**Fuel grades:** `Regular`, `MidGrade`, `Premium`, `Diesel`, `E85`

**Response** `201 Created`.

### PUT /vehicles/{vehicleId}/fillups/{id}

Same body as POST.

**Response** `200 OK` or `404`.

### DELETE /vehicles/{vehicleId}/fillups/{id}

**Response** `204 No Content` or `404`.

### Fill-up response object

```json
{
  "id": 42,
  "vehicleId": 1,
  "filledAt": "2025-04-28T14:30:00-07:00",
  "odometerReading": 18542.3,
  "gallonsAdded": 14.7,
  "fuelGrade": "MidGrade",
  "pricePerGallon": 3.459,
  "totalCost": 50.85,
  "isFullFillUp": true,
  "stationName": "Costco Gas",
  "stationAddress": "123 Main St",
  "latitude": 47.6062,
  "longitude": -122.3321,
  "notes": "",
  "milesSinceLastFillUp": 312.1,
  "mpgThisFillUp": 21.2,
  "costPerMile": 0.163
}
```

`milesSinceLastFillUp`, `mpgThisFillUp`, and `costPerMile` are computed and will be `null` on the first fill-up or when `isFullFillUp` is `false`.

---

## Analytics

All analytics endpoints require `pitstop:read` scope and return `404` if the vehicle doesn't exist or isn't owned by the caller.

### GET /vehicles/{vehicleId}/analytics/summary

Overall lifetime statistics.

**Response** `200 OK`

```json
{
  "vehicleId": 1,
  "totalFillUps": 47,
  "totalGallons": 689.4,
  "totalSpend": 2381.22,
  "totalMiles": 14823.0,
  "overallMpg": 21.5,
  "rollingAvgMpg3": 22.1,
  "rollingAvgMpg10": 21.7,
  "avgCostPerGallon": 3.45,
  "avgCostPerMile": 0.161,
  "lastFillUp": "2025-04-28T14:30:00-07:00",
  "lastOdometer": 18542.3
}
```

Fields that require at least one full fill-up with a previous fill-up will be `null` on a new vehicle.

### GET /vehicles/{vehicleId}/analytics/mpg

MPG data points over time with a rolling 10-fill-up average.

**Response** `200 OK`

```json
{
  "points": [
    {
      "date": "2025-01-15",
      "odometerReading": 5210.0,
      "mpg": 21.4,
      "rollingAvg": 21.1
    }
  ]
}
```

`rollingAvg` is `null` until at least 3 full fill-ups are recorded.

### GET /vehicles/{vehicleId}/analytics/spend

Monthly spend grouped by year and month.

**Response** `200 OK`

```json
{
  "points": [
    {
      "year": 2025,
      "month": 4,
      "totalSpend": 152.4,
      "totalGallons": 44.1,
      "fillUpCount": 3
    }
  ]
}
```

---

## Error Responses

All errors use RFC 9457 `ProblemDetails` format.

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "At least one of pricePerGallon or totalCost must be provided."
}
```
