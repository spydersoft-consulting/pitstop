import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NavigationBar } from "./NavigationBar";
import { AuthContext } from "../../context/AuthContext";

interface RenderOpts {
  isAuthenticated?: boolean;
  userName?: string;
  brand?: string;
}

function renderNav({
  isAuthenticated = false,
  userName,
  brand,
}: RenderOpts = {}) {
  const login = vi.fn();
  const logout = vi.fn();
  return {
    login,
    logout,
    ...render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            isLoading: false,
            isAuthenticated,
            user: isAuthenticated
              ? { name: userName ?? "", authenticated: true, exp: 0 }
              : undefined,
            login,
            logout,
            refreshAuth: async () => undefined,
          }}
        >
          <NavigationBar brand={brand} />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  };
}

describe("NavigationBar", () => {
  it("renders the supplied brand in both desktop and mobile views", () => {
    renderNav({ brand: "PitStopTest" });
    // Brand renders once for desktop sidebar and once for mobile top bar.
    expect(screen.getAllByText("PitStopTest").length).toBe(2);
  });

  it("falls back to 'PitStop' brand when none is provided", () => {
    renderNav();
    expect(screen.getAllByText("PitStop").length).toBe(2);
  });

  it("renders primary nav items", () => {
    renderNav();
    // Desktop renders the labels — drawer is hidden until opened.
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Vehicles")).toBeInTheDocument();
    expect(screen.getByText("Fill-Ups")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("shows Sign in and triggers login when unauthenticated", async () => {
    const user = userEvent.setup();
    const { login } = renderNav({ isAuthenticated: false });
    const signIn = screen.getByRole("button", { name: /sign in/i });
    await user.click(signIn);
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("shows user name and Sign out when authenticated", async () => {
    const user = userEvent.setup();
    const { logout } = renderNav({
      isAuthenticated: true,
      userName: "Alice Driver",
    });
    expect(screen.getByText("Alice Driver")).toBeInTheDocument();
    const signOut = screen.getByRole("button", { name: /sign out/i });
    await user.click(signOut);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("toggles desktop sidebar collapse", async () => {
    const user = userEvent.setup();
    renderNav();
    const collapseBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    await user.click(collapseBtn);
    expect(
      screen.getByRole("button", { name: /expand sidebar/i }),
    ).toBeInTheDocument();
  });
});
