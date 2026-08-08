import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { VehicleForm, type VehicleFormValues } from "./VehicleForm";

function renderForm(props: Partial<React.ComponentProps<typeof VehicleForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <MemoryRouter>
      <VehicleForm onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  );
  return { onSubmit, ...utils };
}

const filled: VehicleFormValues = {
  name: "Daily Driver",
  year: 2022,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  tankCapacityGallons: 14,
  initialOdometer: 100,
  startDate: new Date("2026-01-15T00:00:00Z"),
  plateState: "CA",
  plateNumber: "8ABC123",
  vin: "1HGCM82633A123456",
};

describe("VehicleForm", () => {
  it("shows validation errors when required fields are empty on submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Make is required.")).toBeInTheDocument();
    expect(screen.getByText("Model is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a create payload with trimmed values and an ISO start date", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initialValues: filled });

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({
      name: "Daily Driver",
      year: 2022,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      tankCapacityGallons: 14,
      initialOdometer: 100,
      startDate: "2026-01-15",
      vin: "1HGCM82633A123456",
    });
  });

  it("submits an update payload without create-only fields when isEdit is true", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initialValues: filled, isEdit: true });

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body).not.toHaveProperty("initialOdometer");
    expect(body).not.toHaveProperty("startDate");
    expect(body).toMatchObject({
      name: "Daily Driver",
      make: "Honda",
      model: "Accord",
    });
  });

  it("normalizes a blank trim string to null on submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, trim: "   " },
    });

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body.trim).toBeNull();
  });

  it("normalizes a blank VIN to null on submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, vin: "" },
    });

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body.vin).toBeNull();
  });

  it("uppercases the VIN on submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, vin: "1hgcm82633a123456" },
    });

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body.vin).toBe("1HGCM82633A123456");
  });

  it("shows a validation error for a malformed VIN and blocks submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, vin: "TOOSHORT" },
    });

    await user.click(screen.getByRole("button", { name: /add vehicle/i }));

    expect(
      screen.getByText("VIN must be 17 characters (letters and digits, excluding I, O, and Q)."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
