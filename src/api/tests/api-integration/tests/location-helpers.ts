import type { APIRequestContext } from "@playwright/test";
import type { CreateLocationRequest, LocationDto } from "./types";

export function uniqueName(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function createLocation(
  request: APIRequestContext,
  overrides: Partial<CreateLocationRequest> = {},
): Promise<LocationDto> {
  const response = await request.post("/api/v1/locations", {
    data: { name: uniqueName("Loc"), ...overrides },
  });
  return response.json();
}
