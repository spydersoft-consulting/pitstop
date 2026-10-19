import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FormActions } from "./FormActions";
import { CardActions } from "./CardActions";

describe("FormActions", () => {
  it("renders a submit button with the given label and a cancel button", async () => {
    const onCancel = vi.fn();
    render(<FormActions submitLabel="Save Changes" submitting={false} onCancel={onCancel} />);
    expect(screen.getByRole("button", { name: "Save Changes" })).toHaveAttribute("type", "submit");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the submit button while submitting", () => {
    render(<FormActions submitLabel="Add" submitting onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});

describe("CardActions", () => {
  it("calls onEdit and passes the click event to onDelete", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<CardActions onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toHaveProperty("currentTarget");
  });
});
