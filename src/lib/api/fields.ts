/**
 * Pick only allowed fields from an object.
 */
export function pickFields<T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  allowedKeys: readonly string[]
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  }
  return result as Partial<T>;
}
