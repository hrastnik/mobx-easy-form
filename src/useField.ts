import { useMemoOne } from "./useMemoOne";
import {
  createField,
  type CreateFieldArgs,
  type Field,
  type InferParsed,
  type ValidationSchema,
} from "./createField";

export function useField<
  ValueType,
  Schema extends ValidationSchema<unknown> | undefined = undefined,
  ParsedType = InferParsed<Schema, ValueType>,
>(
  args: CreateFieldArgs<
    ValueType,
    ParsedType,
    Schema extends ValidationSchema<ParsedType> ? Schema : undefined
  >,
  deps: ReadonlyArray<unknown> = [],
): Field<ValueType, ParsedType> {
  return useMemoOne(() => createField(args), deps) as Field<
    ValueType,
    ParsedType
  >;
}
