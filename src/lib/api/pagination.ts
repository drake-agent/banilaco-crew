/**
 * Clamp pagination parameters to safe bounds.
 */
export function clampPagination(page: number, limit: number): { page: number; limit: number } {
  return {
    page: Math.max(1, Math.min(isNaN(page) ? 1 : page, 10000)),
    limit: Math.max(1, Math.min(isNaN(limit) ? 20 : limit, 100)),
  };
}
