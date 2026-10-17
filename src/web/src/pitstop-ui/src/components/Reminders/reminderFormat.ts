import { SERVICE_TYPE_OPTIONS } from "../MaintenanceLog/maintenanceLogOptions";

const SERVICE_TYPE_LABELS = Object.fromEntries(SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

export const fmtDate = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString() : "—");

export const fmtMiles = (v: number | string | null | undefined) => {
  const n = num(v);
  return n === null ? "—" : `${Math.round(n).toLocaleString()} mi`;
};

export const toDateOnlyString = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const serviceTypeLabel = (v: string | null | undefined) => (v && SERVICE_TYPE_LABELS[v]) || v || "—";

export const STATUS_LABELS: Record<string, string> = {
  Ok: "On track",
  DueSoon: "Due soon",
  Overdue: "Overdue",
  Snoozed: "Snoozed",
};

export const STATUS_CLASSES: Record<string, string> = {
  Ok: "bg-success/10 text-success",
  DueSoon: "bg-accent/10 text-accent",
  Overdue: "bg-danger/10 text-danger",
  Snoozed: "bg-surface-sunken text-content-muted",
};
