export function isPromise(value: any): value is Promise<any> {
  return Boolean(value && typeof value.then === "function");
}
