import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MaintenanceLogForm, type MaintenanceLogFormValues } from "./MaintenanceLogForm";

vi.mock("../../api/locationsApi", () => ({
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

function renderForm(props: Partial<React.ComponentProps<typeof MaintenanceLogForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <MemoryRouter>
      <MaintenanceLogForm onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  );
  return { onSubmit, ...utils };
}

const filled: MaintenanceLogFormValues = {
  serviceDate: new Date(2026, 0, 15),
  odometerReading: 45230,
  serviceType: "BrakePads",
  description: "Front brake pads replaced",
  performedBy: "Shop",
  isWarrantyWork: false,
  location: null,
  partsCost: 120,
  laborCost: 80,
  totalCost: null,
  notes: "Squeaking resolved",
};

describe("MaintenanceLogForm", () => {
  it("blocks submission and surfaces errors when required fields are missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, serviceDate: null, odometerReading: null },
    });

    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    expect(screen.getByText("Service date is required.")).toBeInTheDocument();
    expect(screen.getByText("Odometer reading is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a payload with no location when none is selected", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, notes: "  " },
    });

    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({
      serviceDate: "2026-01-15",
      odometerReading: 45230,
      serviceType: "BrakePads",
      description: "Front brake pads replaced",
      performedBy: "Shop",
      isWarrantyWork: false,
      locationId: null,
      location: null,
      partsCost: 120,
      laborCost: 80,
      totalCost: null,
      notes: null,
    });
  });

  it("submits locationId when an existing location is pre-selected", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        location: { kind: "existing", id: 7, name: "Joe's Garage", address: "123 Main" },
      },
    });

    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body.locationId).toBe(7);
    expect(body.location).toBeNull();
  });

  it("submits inline location when a new location is staged", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        location: {
          kind: "new",
          name: "  Midas on Main  ",
          address: "  500 Pine  ",
          latitude: 47.6,
          longitude: -122.3,
          googlePlaceId: "ChIJxyz",
        },
      },
    });

    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body.locationId).toBeNull();
    expect(body.location).toEqual({
      name: "Midas on Main",
      address: "500 Pine",
      latitude: 47.6,
      longitude: -122.3,
      googlePlaceId: "ChIJxyz",
    });
  });

  it("blocks submission when an inline new location has no name", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        location: {
          kind: "new",
          name: "   ",
          address: null,
          latitude: null,
          longitude: null,
          googlePlaceId: null,
        },
      },
    });

    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    expect(screen.getByText("Location name is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uses the Save Changes label when in edit mode", () => {
    renderForm({ initialValues: filled, isEdit: true });
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
