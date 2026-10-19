import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "./Modal";
import { Drawer } from "./Drawer";

describe("Modal", () => {
  it("renders header, body and footer in a labelled dialog", () => {
    render(
      <Modal onClose={vi.fn()} header="Edit thing" footer={<button>Save</button>}>
        body text
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Edit thing" })).toBeInTheDocument();
    expect(screen.getByText("body text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} header="Hidden">
        x
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} header="Esc">
        x
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when interacting with a legacy .p-component overlay", async () => {
    const onClose = vi.fn();
    render(
      <>
        <div className="p-component">
          <button>legacy panel item</button>
        </div>
        <Modal onClose={onClose} header="Hold">
          x
        </Modal>
      </>,
    );
    await userEvent.click(screen.getByText("legacy panel item"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("omits the heading and footer when not provided", () => {
    render(<Modal onClose={vi.fn()}>just body</Modal>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("just body")).toBeInTheDocument();
  });
});

describe("Drawer", () => {
  it("shows its content when open and closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose}>
        <nav>links</nav>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <Drawer open={false} onClose={vi.fn()}>
        links
      </Drawer>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
