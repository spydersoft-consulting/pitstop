interface AppConfig {
  api_url: string;
}

declare global {
  var __config: Partial<AppConfig> | undefined;
}

const defaults: AppConfig = {
  api_url: "/api/v1",
};

export function getConfig<K extends keyof AppConfig>(key: K): string {
  return globalThis.__config?.[key] ?? defaults[key];
}
