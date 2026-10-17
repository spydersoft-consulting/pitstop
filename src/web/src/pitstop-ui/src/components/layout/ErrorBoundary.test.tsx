import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("../../logging", () => ({ logError: vi.fn() }));

import { logError } from "../../logging";

const Boom: React.FC = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("renders nothing for a failing child by default, leaving siblings intact", () => {
    render(
      <div>
        <p>sibling</p>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </div>,
    );

    expect(screen.getByText("sibling")).toBeInTheDocument();
    expect(logError).toHaveBeenCalled();
  });

  it("renders the fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>unavailable</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });
});
