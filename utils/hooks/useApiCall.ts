import { useState, useCallback } from "react";

/**
 * Hook for managing loading/error state around async API calls.
 * Eliminates repeated loading + error + try/catch patterns across components.
 *
 * Usage:
 *   const { loading, error, execute } = useApiCall();
 *   const data = await execute(() => apiClient.post('/api/blogs', { title }));
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (err) {
        const message = (err as Error).message || "An error occurred";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, execute, clearError };
}
