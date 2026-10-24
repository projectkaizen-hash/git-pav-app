export type QueryStateView = "offline" | "loading" | "error" | "empty" | "success";

export interface ResolveQueryStateParams<T> {
  isOnline: boolean;
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  data: T | null | undefined;
  isEmpty?: (data: T) => boolean;
}

/**
 * Resolves which state view to render based on connectivity, query status, and data presence (MA-4).
 */
export function resolveQueryState<T>(params: ResolveQueryStateParams<T>): QueryStateView {
  // 1. Offline state (when offline and no cached data to display)
  if (!params.isOnline && (params.data === null || params.data === undefined)) {
    return "offline";
  }

  // 2. Loading state (when loading and no cached data)
  if (params.isLoading && (params.data === null || params.data === undefined)) {
    return "loading";
  }

  // 3. Error state (when error occurred and no cached data)
  if ((params.isError || params.error) && (params.data === null || params.data === undefined)) {
    return "error";
  }

  // 4. Empty state
  const isDataEmpty =
    params.data === null ||
    params.data === undefined ||
    (Array.isArray(params.data) && params.data.length === 0) ||
    (params.isEmpty ? params.isEmpty(params.data) : false);

  if (isDataEmpty) {
    return "empty";
  }

  // 5. Success state
  return "success";
}
