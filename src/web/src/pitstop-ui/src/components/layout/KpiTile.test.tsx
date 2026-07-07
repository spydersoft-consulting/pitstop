import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { faGasPump } from "@fortawesome/free-solid-svg-icons";
import { KpiTile } from "./KpiTile";

describe("KpiTile", () => {
  it("renders label and value", () => {
    render(<KpiTile icon={faGasPump} label="Avg MPG" value="32.4" />);
    expect(screen.getByText("Avg MPG")).toBeInTheDocument();
    expect(screen.getByText("32.4")).toBeInTheDocument();
  });

  it("renders unit when provided", () => {
    render(
      <KpiTile icon={faGasPump} label="Est. range" value="412" unit="mi" />,
    );
    expect(screen.getByText("mi")).toBeInTheDocument();
  });

  it("omits unit when not provided", () => {
    const { container } = render(
      <KpiTile icon={faGasPump} label="Last fill" value="$42.71" />,
    );
    // The unit span only renders when unit is set.
    expect(container.querySelector("span.text-xs")).toBeNull();
  });
});
