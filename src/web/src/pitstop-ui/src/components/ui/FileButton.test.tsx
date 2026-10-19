import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileButton } from "./FileButton";

const pdf = new File(["a"], "a.pdf", { type: "application/pdf" });
const png = new File(["b"], "b.png", { type: "image/png" });

describe("FileButton", () => {
  it("renders a labelled button with a hidden file input", () => {
    const { container } = render(<FileButton label="Add file" onFiles={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add file" })).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("passes accepted types and multiple through to the input", () => {
    const { container } = render(
      <FileButton label="Add file" accept={["application/pdf", "image/png"]} multiple onFiles={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe("application/pdf,image/png");
    expect(input.multiple).toBe(true);
  });

  it("reports the chosen files as an array", async () => {
    const onFiles = vi.fn();
    const { container } = render(<FileButton label="Add file" multiple onFiles={onFiles} />);
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, [pdf, png]);
    expect(onFiles).toHaveBeenCalledWith([pdf, png]);
  });

  it("does nothing when no file is chosen", async () => {
    const onFiles = vi.fn();
    const { container } = render(<FileButton label="Add file" onFiles={onFiles} />);
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, []);
    expect(onFiles).not.toHaveBeenCalled();
  });
});
