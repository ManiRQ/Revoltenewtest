import { useCallback, useEffect, useState } from "react";
import { apiRequest, getErrorMessage } from "./api";

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface StoredResourceState<T> {
  path: string;
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApiResource<T>(path: string): ResourceState<T> {
  const [state, setState] = useState<StoredResourceState<T>>({
    path,
    data: null,
    error: null,
    loading: true,
  });
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => {
    setState((current) => ({
      path,
      data: current.path === path ? current.data : null,
      error: null,
      loading: true,
    }));
    setRevision((current) => current + 1);
  }, [path]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<T>(path, { signal: controller.signal })
      .then((data) => {
        setState({ path, data, error: null, loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            path,
            data: null,
            error: getErrorMessage(reason),
            loading: false,
          });
        }
      });

    return () => controller.abort();
  }, [path, revision]);

  const currentState =
    state.path === path ? state : { path, data: null, error: null, loading: true };

  return { ...currentState, reload };
}
