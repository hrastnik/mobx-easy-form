import { useRef } from "react";

function areInputsEqual(
  next: ReadonlyArray<unknown>,
  prev: ReadonlyArray<unknown>
) {
  if (next.length !== prev.length) return false;
  for (let i = 0; i < next.length; i++) {
    if (next[i] !== prev[i]) return false;
  }
  return true;
}

export function useMemoOne<T>(
  factory: () => T,
  inputs: ReadonlyArray<unknown> = []
): T {
  const cache = useRef<{ inputs: ReadonlyArray<unknown>; value: T } | null>(
    null
  );

  if (cache.current === null || !areInputsEqual(inputs, cache.current.inputs)) {
    cache.current = { inputs, value: factory() };
  }

  return cache.current.value;
}
