import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { AuthProvider, useAuth } from "./AuthContext";
import { notifyUnauthorized } from "./authSession";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

function Consumer() {
  const { isAuthenticated, user, isLoading, login, logout, refreshAuth } = useAuth();
  return (
    <div>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="user">{user?.name ?? ""}</span>
      <button onClick={login}>login</button>
      <button onClick={logout}>logout</button>
      <button onClick={() => void refreshAuth()}>refresh</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockedAxios.get.mockReset();
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
  });
});

describe("AuthProvider", () => {
  it("fetches the user on mount and marks the session authenticated", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true"));
    expect(screen.getByTestId("user")).toHaveTextContent("Jane Doe");
    expect(localStorage.getItem("isAuthenticated")).toBe("true");
    expect(mockedAxios.get).toHaveBeenCalledWith("/.auth/me");
  });

  it("skips the mount fetch when a fresh cached user is present", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("user", JSON.stringify({ name: "Cached User", authenticated: true, exp }));

    renderAuth();

    expect(screen.getByTestId("user")).toHaveTextContent("Cached User");
    await waitFor(() => expect(mockedAxios.get).not.toHaveBeenCalled());
  });

  it("starts isLoading true on first render when there is no cached session", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();

    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("isLoading")).toHaveTextContent("false"));
  });

  it("starts isLoading false on first render when a fresh cached user is present", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("user", JSON.stringify({ name: "Cached User", authenticated: true, exp }));

    renderAuth();

    expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
  });

  it("starts isLoading true on first render when the cached user has expired", async () => {
    const exp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("user", JSON.stringify({ name: "Cached User", authenticated: true, exp }));
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Cached User", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();

    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("isLoading")).toHaveTextContent("false"));
  });

  it("clears auth state without redirecting on a 401 for a never-authenticated visitor", async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("isLoading")).toHaveTextContent("false"));
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(localStorage.getItem("isAuthenticated")).toBeNull();
    expect(window.location.href).toBe("");
  });

  it("redirects through /.auth/login when a previously-authenticated session lapses", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();
    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true"));

    mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } });
    act(() => {
      screen.getByText("refresh").click();
    });

    await waitFor(() => expect(window.location.href).toBe("/.auth/login"));
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(localStorage.getItem("isAuthenticated")).toBeNull();
    // Setting location.href doesn't navigate synchronously -- isLoading must stay true
    // for the rest of this page's life so AppRouter keeps showing its spinner instead of
    // ever rendering Landing (isAuthenticated=false, isLoading=false) before the browser
    // actually leaves for the IdP.
    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
  });

  it("keeps isLoading true (never flashes Landing) when a lapsed session is caught by the global unauthorized handler", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();
    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true"));
    expect(screen.getByTestId("isLoading")).toHaveTextContent("false");

    act(() => {
      notifyUnauthorized();
    });

    await waitFor(() => expect(window.location.href).toBe("/.auth/login"));
    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
  });

  it("logs out without triggering a login redirect, then sends the browser to end-session", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();
    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true"));

    act(() => {
      screen.getByText("logout").click();
    });

    expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false");
    expect(window.location.href).toBe("/.auth/end-session");
    expect(screen.getByTestId("isLoading")).toHaveTextContent("true");
  });

  it("routes the global unauthorized handler through clearAuthState", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", exp: Math.floor(Date.now() / 1000) + 3600 },
    });

    renderAuth();
    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("true"));

    act(() => {
      notifyUnauthorized();
    });

    await waitFor(() => expect(screen.getByTestId("isAuthenticated")).toHaveTextContent("false"));
    expect(window.location.href).toBe("/.auth/login");
  });
});
