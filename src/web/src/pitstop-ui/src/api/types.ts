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

export type NotificationPriority = "Low" | "Normal" | "High";
export type NotificationStatus = "Created" | "Dispatching" | "Dispatched" | "PartiallyFailed";

export interface NotificationDto {
  id: string;
  userId: string;
  source: string;
  type: string;
  subject: string;
  body: string;
  data?: Record<string, string> | null;
  priority: NotificationPriority;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
}

// Pushed over the SignalR hub — a narrower shape than NotificationDto (no status/entity fields).
export interface NotificationPushDto {
  id: string;
  source: string;
  type: string;
  subject: string;
  body: string;
  priority: NotificationPriority;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export type DeviceType = "Web" | "Ios" | "Android";

export interface RegisterDeviceRequest {
  deviceType: DeviceType;
  label: string;
  pushToken?: string | null;
}

export interface DeviceDto {
  id: string;
  deviceType: DeviceType;
  label: string;
  lastSeenAt: string;
  registeredAt: string;
  isActive: boolean;
}
