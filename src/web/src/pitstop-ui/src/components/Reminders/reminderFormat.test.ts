import { describe, it, expect } from "vitest";
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  fmtDate,
  fmtMiles,
  num,
  serviceTypeLabel,
  toDateOnlyString,
} from "./reminderFormat";

describe("num", () => {
  it.each([
    [5, 5],
    ["12.5", 12.5],
    [0, 0],
  ])("parses %j as %j", (input, expected) => {
    expect(num(input)).toBe(expected);
  });

  it.each([[null], [undefined], ["not a number"], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    "returns null for %j",
    (input) => {
      expect(num(input as number | string | null | undefined)).toBeNull();
    },
  );
});

describe("fmtDate", () => {
  it("formats a date-only string in the local locale", () => {
    expect(fmtDate("2026-07-15")).toBe(new Date("2026-07-15T00:00:00").toLocaleDateString());
  });

  it.each([[null], [undefined], [""]])("shows a dash for %j", (input) => {
    expect(fmtDate(input)).toBe("—");
  });
});

describe("fmtMiles", () => {
  it("rounds and groups thousands", () => {
    expect(fmtMiles(44600.4)).toBe(`${(44600).toLocaleString()} mi`);
  });

  it("accepts numeric strings", () => {
    expect(fmtMiles("5000")).toBe(`${(5000).toLocaleString()} mi`);
  });

  it.each([[null], [undefined], ["abc"]])("shows a dash for %j", (input) => {
    expect(fmtMiles(input as number | string | null | undefined)).toBe("—");
  });
});

describe("toDateOnlyString", () => {
  it("pads the month and day using the local date", () => {
    expect(toDateOnlyString(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateOnlyString(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("serviceTypeLabel", () => {
  it("uses the display label for a known service type", () => {
    expect(serviceTypeLabel("OilChange")).toBe("Oil Change");
  });

  it("falls back to the raw value for an unknown type", () => {
    expect(serviceTypeLabel("Mystery")).toBe("Mystery");
  });

  it.each([[null], [undefined], [""]])("shows a dash for %j", (input) => {
    expect(serviceTypeLabel(input)).toBe("—");
  });
});

describe("status styling", () => {
  it("has a label and classes for every status", () => {
    for (const status of ["Ok", "DueSoon", "Overdue", "Snoozed"]) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_CLASSES[status]).toBeTruthy();
    }
  });
});
