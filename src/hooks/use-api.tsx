'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ──────────────────────────────────

interface UseApiOptions {
  /** Skip initial fetch (manual trigger only) */
  skip?: boolean;
  /** Refetch interval in ms (0 = disabled) */
  refreshInterval?: number;
}

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─── Core Hook ──────────────────────────────

export function useApi<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/${endpoint}`, window.location.origin);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== '') {
            url.searchParams.set(key, String(value));
          }
        }
      }

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [endpoint, JSON.stringify(params)]);

  // Auto-fetch on mount / param change
  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
    return () => abortRef.current?.abort();
  }, [fetchData, options.skip]);

  // Refresh interval
  useEffect(() => {
    if (!options.refreshInterval || options.skip) return;
    const id = setInterval(fetchData, options.refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, options.refreshInterval, options.skip]);

  return { data, error, loading, refetch: fetchData };
}

// ─── Mutation Hook ──────────────────────────

interface UseMutationResult<T> {
  mutate: (body?: Record<string, unknown>) => Promise<T | null>;
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useMutation<T = unknown>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST'
): UseMutationResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (body?: Record<string, unknown>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
      return json;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
    },
    [endpoint, method]
  );

  return { mutate, data, error, loading };
}

// ─── Helpers ────────────────────────────────

/** Loading skeleton placeholder */
export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" />
      ))}
    </div>
  );
}

/** Error banner */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 hover:text-red-800 underline ml-4"
        >
          Retry
        </button>
      )}
    </div>
  );
}
