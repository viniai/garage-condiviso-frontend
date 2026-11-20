import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";
import type { Me } from "../api/types";

const KEY = "gc.token";

function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage non disponibile: la sessione dura quanto la pagina */
  }
}

interface SessionValue {
  token: string | null;
  me: Me | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(token !== null);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setMe(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setMe(await api.me(token));
    } catch {
      logout(); // token scaduto o non valido
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [token, refresh]);

  const login = useCallback((next: string) => {
    writeToken(next);
    setToken(next);
  }, []);

  const value = useMemo(() => ({ token, me, loading, login, logout, refresh }), [token, me, loading, login, logout, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fuori da SessionProvider");
  return ctx;
}

export const NEXT_KEY = "gc.next";
export function rememberNext(path: string): void {
  try {
    sessionStorage.setItem(NEXT_KEY, path);
  } catch {
    /* ignora */
  }
}
export function takeNext(): string | null {
  try {
    const value = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return value;
  } catch {
    return null;
  }
}
