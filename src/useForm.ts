import { useCallback, useLayoutEffect, useRef } from "react";
import { useMemoOne } from "./useMemoOne";
import { createForm, type CreateFormArgs, type Form } from "./createForm";

function useEvent<Args extends unknown[], ReturnValue>(
  handler: (...args: Args) => ReturnValue,
) {
  const handlerRef = useRef<(...args: Args) => ReturnValue>(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args: Args) => handlerRef.current(...args), []);
}

export function useForm(
  args: CreateFormArgs,
  deps: ReadonlyArray<unknown> = [],
): Form {
  const onSubmit = useEvent(args.onSubmit);
  return useMemoOne(() => createForm({ ...args, onSubmit }), deps);
}
