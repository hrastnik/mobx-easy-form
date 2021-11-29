export function isPromise<T, S>(
  value: PromiseLike<T> | S
): value is PromiseLike<T> {
  return Boolean(value && "then" in value && typeof value.then === "function");
}
