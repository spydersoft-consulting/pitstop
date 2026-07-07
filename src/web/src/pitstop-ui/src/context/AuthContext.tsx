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

const isFresh = (exp: number): boolean =>
  exp > 0 && Date.now() < exp * 1000 - REFRESH_WINDOW_MS;

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

  const [isLoading, setIsLoading] = useState(false);
  const inflight = useRef<Promise<void> | null>(null);

  const clearAuthState = () => {
    setIsAuthenticated(false);
    setUser(undefined);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
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
          clearAuthState();
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
    return registerUnauthorizedHandler(clearAuthState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = () => {
    globalThis.location.href = "/.auth/login";
  };

  const logout = () => {
    clearAuthState();
    globalThis.location.href = "/.auth/end-session";
  };

  const refreshAuth = () => fetchUser();

  const contextValue = useMemo<IAuthContext>(
    () => ({ isAuthenticated, user, isLoading, login, logout, refreshAuth }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated, user, isLoading],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};
