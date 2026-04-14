import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function apiError(message: string, status: number, details?: unknown): NextResponse<ApiError> {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

export function handleRouteError(error: unknown, context: string): NextResponse<ApiError> {
  console.error(`[${context}]`, error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return apiError(message, 500);
}

/**
 * Safe JSON body parser. Returns parsed body or a 400 response.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse<ApiError> }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return { error: apiError('Invalid JSON body', 400) };
  }
}
