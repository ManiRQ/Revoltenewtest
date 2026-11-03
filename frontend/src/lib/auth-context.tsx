import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "./api";
import type { CurrentSession } from "../types";

interface AuthContextValue {
  session: CurrentSession | null;
  setupComplete: boolean | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthState(signal?: AbortSignal) {
  const options = signal ? { signal } : undefined;
  return Promise.all([
    apiRequest<{ complete: boolean }>("/api/setup/status", options),
    apiRequest<CurrentSession | null>("/api/me", options),
  ]);
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "DeskPilot could not connect to its service.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CurrentSession | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [setup, current] = await fetchAuthState();
      setSetupComplete(setup.complete);
      setSession(current);
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAuthState(controller.signal)
      .then(([setup, current]) => {
        setSetupComplete(setup.complete);
        setSession(current);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const value = useMemo(
    () => ({ session, setupComplete, loading, error, refresh }),
    [session, setupComplete, loading, error, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
