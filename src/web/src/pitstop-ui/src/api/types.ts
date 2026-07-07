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
  stationName?: string;
  stationAddress?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  milesSinceLastFillUp?: number;
  mpgThisFillUp?: number;
  costPerMile?: number;
}

export interface FillUpListResponse {
  items: FillUpDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
