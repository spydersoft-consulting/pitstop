import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReminderForm, type ReminderFormValues } from "./ReminderForm";
import type { ReminderTemplate } from "../../store/slices/reminderSlice";

const templates: ReminderTemplate[] = [
  {
    serviceType: "OilChange",
    name: "Oil change",
    intervalMiles: 5000,
    intervalMonths: 6,
    leadMiles: 500,
    leadDays: 14,
  },
  { serviceType: "BrakeFluid", name: "Brake fluid", intervalMonths: 24, leadDays: 30 },
];

const existing: ReminderFormValues = {
  serviceType: "OilChange",
  name: "Oil change",
  intervalMiles: 5000,
  intervalMonths: 6,
  leadMiles: 500,
  leadDays: 14,
  isActive: true,
};

function renderForm(props: Partial<React.ComponentProps<typeof ReminderForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={["/form"]}>
      <Routes>
        <Route path="/form" element={<ReminderForm templates={templates} onSubmit={onSubmit} {...props} />} />
        <Route path="/reminders" element={<p>Reminders list</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onSubmit, ...utils };
}

async function chooseServiceType(user: ReturnType<typeof userEvent.setup>, container: HTMLElement, label: string) {
  await user.click(container.querySelector(".p-dropdown")!);
  await user.click(document.querySelector<HTMLElement>(`li[aria-label="${label}"]`)!);
}

describe("ReminderForm", () => {
  it("labels the submit button for adding and for editing", () => {
    const { unmount } = renderForm();
    expect(screen.getByRole("button", { name: "Add Reminder" })).toBeInTheDocument();
    unmount();

    renderForm({ initialValues: existing, isEdit: true });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("submits a months-only reminder with no name", async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/repeat every \(months\)/i), "12");
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(onSubmit).toHaveBeenCalledWith({
      serviceType: "OilChange",
      name: null,
      intervalMiles: null,
      intervalMonths: 12,
      leadMiles: null,
      leadDays: null,
      isActive: true,
    });
  });

  it("submits lead times and trims the name", async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "  Synthetic  ");
    await user.type(screen.getByLabelText(/repeat every \(miles\)/i), "7500");
    await user.type(screen.getByLabelText(/notify this many miles ahead/i), "750");
    await user.type(screen.getByLabelText(/notify this many days ahead/i), "10");
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Synthetic", intervalMiles: 7500, leadMiles: 750, leadDays: 10 }),
    );
  });

  it("can turn notifications off for the reminder", async () => {
    const { onSubmit } = renderForm({ initialValues: existing });
    const user = userEvent.setup();

    await user.click(screen.getByLabelText(/send notifications for this reminder/i));
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it("prefills the intervals from the template when a new reminder's service type changes", async () => {
    const { onSubmit, container } = renderForm();
    const user = userEvent.setup();

    await chooseServiceType(user, container, "Brake Fluid");
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: "BrakeFluid",
        intervalMiles: null,
        intervalMonths: 24,
        leadMiles: null,
        leadDays: 30,
      }),
    );
  });

  it("keeps what was typed when the new service type has no template", async () => {
    const { onSubmit, container } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/repeat every \(miles\)/i), "9000");
    await chooseServiceType(user, container, "Brake Pads");
    await user.click(screen.getByRole("button", { name: "Add Reminder" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serviceType: "BrakePads", intervalMiles: 9000 }));
  });

  it("does not overwrite an existing reminder's intervals when editing", async () => {
    const { onSubmit, container } = renderForm({ initialValues: existing, isEdit: true });
    const user = userEvent.setup();

    await chooseServiceType(user, container, "Brake Fluid");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ serviceType: "BrakeFluid", intervalMiles: 5000, intervalMonths: 6 }),
    );
  });

  it("clears the interval error once the owner changes something", async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add Reminder" }));
    expect(screen.getByText(/set an interval in miles, months, or both/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), "x");

    expect(screen.queryByText(/set an interval in miles, months, or both/i)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("returns to the reminders list on Cancel", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Reminders list")).toBeInTheDocument();
  });
});
