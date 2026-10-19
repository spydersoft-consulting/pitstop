import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const destroy = vi.fn();
const ctor = vi.fn();

vi.mock("chart.js/auto", () => ({
  default: class {
    constructor(...args: unknown[]) {
      ctor(...args);
    }
    destroy = destroy;
  },
}));

import { Chart } from "./Chart";

const data = { labels: ["a"], datasets: [{ data: [1] }] };

describe("Chart", () => {
  beforeEach(() => {
    destroy.mockClear();
    ctor.mockClear();
  });

  it("creates a chart.js instance on the canvas with the given config", () => {
    const { container } = render(<Chart type="line" data={data} className="h-full" />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("relative", "h-full");
    expect(ctor).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), { type: "line", data, options: undefined });
  });

  it("destroys the chart on unmount and recreates it when data changes", () => {
    const { rerender, unmount } = render(<Chart type="bar" data={data} />);
    rerender(<Chart type="bar" data={{ ...data }} />);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledTimes(2);
    unmount();
    expect(destroy).toHaveBeenCalledTimes(2);
  });
});
