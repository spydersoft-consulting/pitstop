export interface VehicleDto {
  id: number;
  name: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  initialOdometer: number;
  tankCapacityGallons?: number;
  startDate: string;
}

export interface CreateVehicleRequest {
  name: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  initialOdometer?: number;
  tankCapacityGallons?: number;
  startDate: string;
}

export interface UpdateVehicleRequest {
  name: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  tankCapacityGallons?: number;
}

export interface LocationSummaryDto {
  id: number;
  name: string;
  address?: string | null;
}

export interface FillUpDto {
  id: number;
  vehicleId: number;
  filledAt: string;
  odometerReading: number;
  gallonsAdded: number;
  fuelGrade: string;
  pricePerGallon: number;
  totalCost: number;
  isFullFillUp: boolean;
  location?: LocationSummaryDto | null;
  notes?: string | null;
  milesSinceLastFillUp?: number;
  mpgThisFillUp?: number;
  costPerMile?: number;
}

export interface CreateFillUpRequest {
  filledAt?: string;
  odometerReading: number;
  gallonsAdded: number;
  fuelGrade?: string;
  pricePerGallon?: number;
  totalCost?: number;
  isFullFillUp?: boolean;
  locationId?: number;
  location?: CreateLocationRequest;
  notes?: string;
}

export interface FillUpRequest extends CreateFillUpRequest {
  filledAt: string;
}

export interface FillUpListResponse {
  items: FillUpDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SummaryResponse {
  vehicleId: number;
  totalFillUps: number;
  totalGallons: number;
  totalSpend: number;
  totalMiles: number;
  overallMpg?: number;
  rollingAvgMpg3?: number;
  rollingAvgMpg10?: number;
  avgCostPerGallon?: number;
  avgCostPerMile?: number;
  lastFillUp?: string;
  lastOdometer?: number;
}

export interface MpgDataPoint {
  date: string;
  odometerReading: number;
  mpg?: number;
  rollingAvg?: number;
}

export interface MpgOverTimeResponse {
  points: MpgDataPoint[];
}

export interface SpendDataPoint {
  year: number;
  month: number;
  totalSpend: number;
  totalGallons: number;
  fillUpCount: number;
}

export interface SpendResponse {
  points: SpendDataPoint[];
}

export interface LocationDto {
  id: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  lastUsedAt?: string | null;
  useCount: number;
}

export interface CreateLocationRequest {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
}

export interface MaintenanceLogDto {
  id: number;
  vehicleId: number;
  serviceDate: string;
  odometerReading: number;
  serviceType: string;
  description?: string | null;
  performedBy: string;
  location?: LocationSummaryDto | null;
  partsCost?: number | null;
  laborCost?: number | null;
  totalCost?: number | null;
  nextServiceOdometer?: number | null;
  nextServiceDate?: string | null;
  notes?: string | null;
  computedTotalCost?: number | null;
}

export interface CreateMaintenanceLogRequest {
  serviceDate?: string;
  odometerReading: number;
  serviceType: string;
  description?: string;
  performedBy: string;
  locationId?: number;
  location?: CreateLocationRequest;
  partsCost?: number;
  laborCost?: number;
  totalCost?: number;
  nextServiceOdometer?: number;
  nextServiceDate?: string;
  notes?: string;
}

export interface UpdateMaintenanceLogRequest extends CreateMaintenanceLogRequest {
  serviceDate: string;
}

export interface MaintenanceLogListResponse {
  items: MaintenanceLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
