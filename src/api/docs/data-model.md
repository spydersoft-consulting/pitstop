# Data Model

## Entities

### Vehicle

Represents a tracked vehicle. Owned by a single user, identified by the JWT `sub` claim.

| Column                | Type     | Notes                                           |
| --------------------- | -------- | ----------------------------------------------- |
| `Id`                  | int      | PK, auto-increment                              |
| `OwnerId`             | string   | JWT `sub` claim                                 |
| `Name`                | string   | Display name                                    |
| `Year`                | int      | Model year                                      |
| `Make`                | string   | e.g. Ford                                       |
| `Model`               | string   | e.g. Bronco                                     |
| `Trim`                | string?  | Optional                                        |
| `InitialOdometer`     | decimal  | Odometer at tracking start                      |
| `TankCapacityGallons` | decimal? | Optional                                        |
| `StartDate`           | DateOnly | Date tracking began                             |
| `PlateState`          | string?  | 2-letter state code                             |
| `PlateNumber`         | string?  | Optional                                        |
| `Vin`                 | string?  | 17-char VIN, ISO 3779 format (excludes I, O, Q) |
| `IsDeleted`           | bool     | Soft delete flag                                |

### FillUp

One fill-up event for a vehicle.

| Column                 | Type           | Notes                              |
| ---------------------- | -------------- | ---------------------------------- |
| `Id`                   | int            | PK, auto-increment                 |
| `VehicleId`            | int            | FK → Vehicle                       |
| `FilledAt`             | DateTimeOffset | Timestamp with timezone            |
| `OdometerReading`      | decimal        | Odometer at this fill-up           |
| `GallonsAdded`         | decimal        |                                    |
| `FuelGrade`            | enum           | See below                          |
| `PricePerGallon`       | decimal        |                                    |
| `TotalCost`            | decimal        |                                    |
| `IsFullFillUp`         | bool           | Whether tank was filled completely |
| `StationName`          | string?        |                                    |
| `StationAddress`       | string?        |                                    |
| `Latitude`             | double?        |                                    |
| `Longitude`            | double?        |                                    |
| `Notes`                | string?        |                                    |
| `MilesSinceLastFillUp` | decimal?       | Computed — see below               |
| `MpgThisFillUp`        | decimal?       | Computed — see below               |

### FuelGrade

| Value      | Description  |
| ---------- | ------------ |
| `Regular`  | 87 octane    |
| `MidGrade` | 89 octane    |
| `Premium`  | 91/93 octane |
| `Diesel`   |              |
| `E85`      |              |

## Computed Fields

Computed fields are recalculated by `FillUpService.RecalculateComputedFieldsAsync` after every create, update, or delete operation on a vehicle's fill-ups. They are stored in the database, not derived at query time.

| Field                  | Formula                               | Null when                                |
| ---------------------- | ------------------------------------- | ---------------------------------------- |
| `MilesSinceLastFillUp` | `currentOdometer - previousOdometer`  | First fill-up for the vehicle            |
| `MpgThisFillUp`        | `MilesSinceLastFillUp / GallonsAdded` | First fill-up, or `IsFullFillUp = false` |
| `CostPerMile`          | `TotalCost / MilesSinceLastFillUp`    | Computed at query time, not stored       |

Fill-ups are ordered by `OdometerReading` (not insertion order) for calculation.

## Database

- **Engine:** PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Migrations:** Applied automatically on API startup via `Database.MigrateAsync()`
- **Indexes:** `(VehicleId, FilledAt)`, `(VehicleId, OdometerReading)`, `OwnerId`

## Historical Data

The initial dataset was imported from a Google Sheets spreadsheet ("Bronco Gas.gsheet") covering October 2025 – April 2026. Costs were matched against Quicken credit card exports using the `match-fillups.ps1` script in `D:\spydersoft\plans\pitstop`. 16 records were imported, all matched to transactions.

Vehicle: 2022 Ford Bronco Outer Banks — `InitialOdometer = 0`, `TankCapacityGallons = 20.8`, `StartDate = 2025-10-25`.
