import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { registerUnauthorizedHandler } from "./authSession";

export interface UserInfo {
  name: string;
  authenticated: boolean;
  exp: number;
}

const DISPLAY_NAME_CLAIMS = ["name", "preferred_username", "email"] as const;
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

const resolveDisplayName = (claims: Record<string, unknown>): string => {
  for (const key of DISPLAY_NAME_CLAIMS) {
    const value = claims[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
};

const toEpochSeconds = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isFresh = (exp: number): boolean => exp > 0 && Date.now() < exp * 1000 - REFRESH_WINDOW_MS;

interface IAuthContext {
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: UserInfo;
  login: () => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = React.createContext<IAuthContext>({
  isLoading: false,
  isAuthenticated: false,
  login: () => void 0,
  logout: () => void 0,
  refreshAuth: async () => void 0,
});

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = (props: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });

  const [user, setUser] = useState<UserInfo | undefined>(() => {
    const saved = localStorage.getItem("user");
    return saved ? (JSON.parse(saved) as UserInfo) : undefined;
  });

  // Start in a loading state unless we have a still-fresh cached session, so
  // consumers (e.g. AppRouter) can hold off rendering the logged-out view
  // until the mount-time /.auth/me check below has had a chance to resolve.
  const [isLoading, setIsLoading] = useState(() => {
    const saved = localStorage.getItem("user");
    const cached = saved ? (JSON.parse(saved) as UserInfo) : undefined;
    return !(cached && isFresh(cached.exp));
  });
  const inflight = useRef<Promise<void> | null>(null);

  // Whether the session was previously known-good before this clear, so we can tell
  // "returning user whose session lapsed" apart from "never-authenticated visitor".
  const clearAuthState = (wasAuthenticated: boolean) => {
    setIsAuthenticated(false);
    setUser(undefined);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");

    // A session that was valid a moment ago going invalid means the access/refresh
    // token expired server-side. Send the browser through /.auth/login: if the
    // upstream IdP session cookie is still alive this is a silent SSO round-trip
    // that drops the user straight back into the app; if it isn't, it lands them on
    // the IdP's real login page. Either way beats stranding them on Landing with a
    // stale "logged in" UI. Because localStorage is cleared first, a failed attempt
    // won't re-trigger this on the next load, so it can't loop.
    if (wasAuthenticated) {
      login();
    }
  };

  const fetchUser = (): Promise<void> => {
    if (inflight.current) return inflight.current;

    setIsLoading(true);
    const p = axios
      .get<Record<string, unknown>>("/.auth/me")
      .then((r) => {
        const userInfo: UserInfo = {
          name: resolveDisplayName(r.data),
          authenticated: true,
          exp: toEpochSeconds(r.data.exp),
        };
        setIsAuthenticated(true);
        setUser(userInfo);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(userInfo));
      })
      .catch((err: { response?: { status: number } }) => {
        if (err.response?.status === 401) {
          clearAuthState(isAuthenticated);
        }
      })
      .finally(() => {
        setIsLoading(false);
        inflight.current = null;
      });

    inflight.current = p;
    return p;
  };

  useEffect(() => {
    if (user && isFresh(user.exp)) return;
    void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.exp) return;
    const msUntilRefresh = user.exp * 1000 - REFRESH_WINDOW_MS - Date.now();
    const handle = globalThis.setTimeout(
      () => {
        void fetchUser();
      },
      Math.max(msUntilRefresh, 0),
    );
    return () => globalThis.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.exp]);

  useEffect(() => {
    return registerUnauthorizedHandler(() => clearAuthState(isAuthenticated));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const login = () => {
    globalThis.location.href = "/.auth/login";
  };

  const logout = () => {
    clearAuthState(false);
    globalThis.location.href = "/.auth/end-session";
  };

  const refreshAuth = () => fetchUser();

  const contextValue = useMemo<IAuthContext>(
    () => ({ isAuthenticated, user, isLoading, login, logout, refreshAuth }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, user, isLoading],
  );

  return <AuthContext.Provider value={contextValue}>{props.children}</AuthContext.Provider>;
};
