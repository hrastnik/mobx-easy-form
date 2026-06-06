import { useCallback, useLayoutEffect, useRef } from "react";
import { useMemoOne } from "./useMemoOne";
import {
  createForm,
  type CreateFormArgs,
  type Form,
  type FormFields,
} from "./createForm";

function useEvent<Args extends unknown[], ReturnValue>(
  handler: (...args: Args) => ReturnValue,
) {
  const handlerRef = useRef<(...args: Args) => ReturnValue>(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args: Args) => handlerRef.current(...args), []);
}

export function useForm<Fields extends FormFields>(
  args: CreateFormArgs<Fields>,
  deps: ReadonlyArray<unknown> = [],
): Form<Fields> {
  const onSubmit = useEvent(args.onSubmit);
  return useMemoOne(() => createForm<Fields>({ ...args, onSubmit }), deps);
}
