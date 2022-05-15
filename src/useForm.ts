import React from "react";
import { useMemoOne } from "use-memo-one";
import { createForm, CreateFormArgs } from "./createForm";

type UseEventHandler<Args extends any[], ReturnValue> = (
  ...args: Args
) => ReturnValue;

function useEvent<Args extends any[], ReturnValue>(
  handler: UseEventHandler<Args, ReturnValue>
) {
  const handlerRef = React.useRef<UseEventHandler<Args, ReturnValue> | null>(
    null
  );

  React.useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return React.useCallback((...args: Args) => {
    const fn = handlerRef.current!;
    return fn(...args);
  }, []);
}

export function useForm(args: CreateFormArgs, deps: any[] = []) {
  const onSubmit = useEvent(args.onSubmit);
  return useMemoOne(
    () =>
      createForm({
        ...args,
        onSubmit,
      }),
    deps
  );
}
