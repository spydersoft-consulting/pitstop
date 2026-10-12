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
  performedBy: "Shop",
  location: null,
  notes: "Squeaking resolved",
  items: [
    {
      serviceType: "BrakePads",
      description: "Front brake pads replaced",
      isWarrantyWork: false,
      partsCost: 120,
      laborCost: 80,
      totalCost: null,
    },
  ],
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
      performedBy: "Shop",
      locationId: null,
      location: null,
      notes: null,
      items: [
        {
          serviceType: "BrakePads",
          description: "Front brake pads replaced",
          isWarrantyWork: false,
          partsCost: 120,
          laborCost: 80,
          totalCost: null,
        },
      ],
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

  it("submits several services, each with its own warranty flag and cost", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        items: [
          { ...filled.items[0], serviceType: "OilChange", description: "", partsCost: 30, laborCost: 20 },
          {
            ...filled.items[0],
            serviceType: "Recall",
            description: " NHTSA 24V-123 ",
            isWarrantyWork: true,
            partsCost: null,
            laborCost: null,
          },
        ],
      },
    });

    expect(screen.getByTestId("visit-total")).toHaveTextContent("Visit total: $50.00");
    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body.items).toEqual([
      {
        serviceType: "OilChange",
        description: null,
        isWarrantyWork: false,
        partsCost: 30,
        laborCost: 20,
        totalCost: null,
      },
      {
        serviceType: "Recall",
        description: "NHTSA 24V-123",
        isWarrantyWork: true,
        partsCost: null,
        laborCost: null,
        totalCost: null,
      },
    ]);
  });

  it("adds and removes service rows", async () => {
    const user = userEvent.setup();
    renderForm({ initialValues: filled });

    expect(screen.queryByRole("button", { name: /remove service/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add another service/i }));
    expect(screen.getByTestId("service-item-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove service 2/i }));
    expect(screen.queryByTestId("service-item-1")).not.toBeInTheDocument();
  });

  it("submits several services, each with its own warranty flag and cost", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        items: [
          { ...filled.items[0], serviceType: "OilChange", description: "", partsCost: 30, laborCost: 20 },
          {
            ...filled.items[0],
            serviceType: "Recall",
            description: " NHTSA 24V-123 ",
            isWarrantyWork: true,
            partsCost: null,
            laborCost: null,
          },
        ],
      },
    });

    expect(screen.getByTestId("visit-total")).toHaveTextContent("Visit total: $50.00");
    await user.click(screen.getByRole("button", { name: /add maintenance log/i }));

    const body = onSubmit.mock.calls[0][0];
    expect(body.items).toEqual([
      {
        serviceType: "OilChange",
        description: null,
        isWarrantyWork: false,
        partsCost: 30,
        laborCost: 20,
        totalCost: null,
      },
      {
        serviceType: "Recall",
        description: "NHTSA 24V-123",
        isWarrantyWork: true,
        partsCost: null,
        laborCost: null,
        totalCost: null,
      },
    ]);
  });

  it("adds and removes service rows", async () => {
    const user = userEvent.setup();
    renderForm({ initialValues: filled });

    expect(screen.queryByRole("button", { name: /remove service/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add another service/i }));
    expect(screen.getByTestId("service-item-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove service 2/i }));
    expect(screen.queryByTestId("service-item-1")).not.toBeInTheDocument();
  });

  it("uses the Save Changes label when in edit mode", () => {
    renderForm({ initialValues: filled, isEdit: true });
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
