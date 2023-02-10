export function isPromise<T, S>(
  value: PromiseLike<T> | S
): value is PromiseLike<T> {
  return !!(
    value &&
    typeof value === "object" &&
    "then" in value &&
    typeof value.then === "function"
  );
}
