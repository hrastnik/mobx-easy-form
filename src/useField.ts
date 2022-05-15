import { useMemoOne } from "use-memo-one";
import { createField, CreateFieldArgs } from "./createField";

export function useField<ValueType = string, ParsedType = string>(
  args: CreateFieldArgs<ValueType, ParsedType>,
  deps: any[] = []
) {
  return useMemoOne(() => createField(args), deps);
}
