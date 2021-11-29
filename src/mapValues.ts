export function mapValues<T, R>(
  object: Record<string, T>,
  callbackFn: (value: T) => R
) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      return [key, callbackFn(value)];
    })
  );
}
