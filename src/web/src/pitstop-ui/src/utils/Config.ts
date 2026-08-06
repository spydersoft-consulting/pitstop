interface AppConfig {
  api_url: string;
  address_lookup_provider: string;
  google_places_api_key: string;
}

declare global {
  var __config: Partial<AppConfig> | undefined;
}

const defaults: AppConfig = {
  api_url: "/api/v1",
  address_lookup_provider: "none",
  google_places_api_key: "",
};

export function getConfig<K extends keyof AppConfig>(key: K): string {
  return globalThis.__config?.[key] ?? defaults[key];
}
