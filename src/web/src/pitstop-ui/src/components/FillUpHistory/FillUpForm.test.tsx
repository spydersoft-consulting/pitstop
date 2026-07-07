import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FillUpForm, type FillUpFormValues } from "./FillUpForm";

vi.mock("../../api/locationsApi", () => ({
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

function renderForm(props: Partial<React.ComponentProps<typeof FillUpForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <MemoryRouter>
      <FillUpForm onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  );
  return { onSubmit, ...utils };
}

const filled: FillUpFormValues = {
  filledAt: new Date("2026-01-15T12:30:00Z"),
  odometerReading: 45230,
  gallonsAdded: 12.345,
  fuelGrade: "Premium",
  pricePerGallon: 3.459,
  totalCost: 42.71,
  isFullFillUp: true,
  location: null,
  notes: "Smelled like burnt toast",
};

describe("FillUpForm", () => {
  it("blocks submission and surfaces errors when required fields are missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        odometerReading: null,
        gallonsAdded: null,
        pricePerGallon: null,
        totalCost: null,
      },
    });

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

    expect(screen.getByText("Odometer reading is required.")).toBeInTheDocument();
    expect(screen.getByText("Gallons added is required.")).toBeInTheDocument();
    expect(screen.getByText("Price per gallon is required.")).toBeInTheDocument();
    expect(screen.getByText("Total cost is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a payload with no location when none is selected", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, notes: "  " },
    });

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({
      odometerReading: 45230,
      gallonsAdded: 12.345,
      pricePerGallon: 3.459,
      totalCost: 42.71,
      isFullFillUp: true,
      fuelGrade: "Premium",
      locationId: null,
      location: null,
      notes: null,
    });
    expect(body.filledAt).toBe("2026-01-15T12:30:00.000Z");
  });

  it("submits locationId when an existing location is pre-selected", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: {
        ...filled,
        location: { kind: "existing", id: 7, name: "Costco", address: "123 Main" },
      },
    });

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

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
          name: "  Shell on Main  ",
          address: "  500 Pine  ",
          latitude: 47.6,
          longitude: -122.3,
          googlePlaceId: "ChIJxyz",
        },
      },
    });

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const body = onSubmit.mock.calls[0][0];
    expect(body.locationId).toBeNull();
    expect(body.location).toEqual({
      name: "Shell on Main",
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

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

    expect(screen.getByText("Location name is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("defaults a blank fuel grade to MidGrade", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initialValues: { ...filled, fuelGrade: "  " },
    });

    await user.click(screen.getByRole("button", { name: /add fill-up/i }));

    expect(onSubmit.mock.calls[0][0].fuelGrade).toBe("MidGrade");
  });

  it("uses the Save Changes label when in edit mode", () => {
    renderForm({ initialValues: filled, isEdit: true });
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });
});
