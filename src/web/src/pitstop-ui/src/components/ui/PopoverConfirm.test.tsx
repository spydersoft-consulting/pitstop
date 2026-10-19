import { useRef, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Popover } from "./Popover";
import { ConfirmPopup } from "./ConfirmPopup";
import { confirmPopup } from "./confirmPopupStore";

const Harness: React.FC<{ nonModal?: boolean }> = ({ nonModal }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} onClick={() => setOpen((v) => !v)}>
        toggle
      </button>
      <Popover open={open} onOpenChange={setOpen} triggerRef={ref} nonModal={nonModal} aria-label="Panel">
        panel body
      </Popover>
    </>
  );
};

describe("Popover", () => {
  it("opens from the trigger and shows its content", async () => {
    render(<Harness />);
    expect(screen.queryByText("panel body")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByRole("dialog", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("panel body")).not.toBeInTheDocument();
  });

  it("keeps the trigger reachable when non-modal", async () => {
    render(<Harness nonModal />);
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByRole("button", { name: "toggle" })).toBeInTheDocument();
  });
});

describe("ConfirmPopup", () => {
  const setup = () => {
    const target = document.createElement("button");
    document.body.appendChild(target);
    render(<ConfirmPopup />);
    return target;
  };

  it("shows the message and runs accept when confirmed", async () => {
    const target = setup();
    const accept = vi.fn();
    act(() => confirmPopup({ target, message: "Delete it?", accept }));
    expect(await screen.findByText("Delete it?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Delete it?")).not.toBeInTheDocument();
  });

  it("runs reject and closes when declined", async () => {
    const target = setup();
    const accept = vi.fn();
    const reject = vi.fn();
    act(() => confirmPopup({ target, message: "Remove?", accept, reject, acceptLabel: "Remove", rejectLabel: "Keep" }));
    await userEvent.click(await screen.findByRole("button", { name: "Keep" }));
    expect(reject).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove?")).not.toBeInTheDocument();
  });

  it("closes on Escape without accepting", async () => {
    const target = setup();
    const accept = vi.fn();
    act(() => confirmPopup({ target, message: "Sure?", accept }));
    await screen.findByText("Sure?");
    await userEvent.keyboard("{Escape}");
    expect(accept).not.toHaveBeenCalled();
    expect(screen.queryByText("Sure?")).not.toBeInTheDocument();
  });
});
