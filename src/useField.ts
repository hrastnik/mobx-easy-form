import { useMemoOne } from "./useMemoOne";
import {
  createField,
  type CreateFieldArgs,
  type Field,
  type InferParsed,
  type InferValidateParsed,
  type LooseValidationFn,
  type ValidationSchema,
} from "./createField";

// Overload: a `validate` function is provided — output type is inferred from it.
export function useField<
  ValueType,
  Validate extends LooseValidationFn<ValueType>,
>(
  args: {
    initialValue: ValueType;
    initialError?: string | undefined;
    validate: Validate;
    validationSchema?: undefined;
  },
  deps?: ReadonlyArray<unknown>,
): Field<ValueType, InferValidateParsed<Validate>>;

// Overload: a validation schema is provided — output type is inferred from it.
export function useField<ValueType, Schema extends ValidationSchema<unknown>>(
  args: {
    initialValue: ValueType;
    initialError?: string | undefined;
    validate?: undefined;
    validationSchema: Schema;
  },
  deps?: ReadonlyArray<unknown>,
): Field<ValueType, InferParsed<Schema, ValueType>>;

// Overload: no validation — the field parses to its own input value.
export function useField<ValueType>(
  args: {
    initialValue: ValueType;
    initialError?: string | undefined;
    validate?: undefined;
    validationSchema?: undefined;
  },
  deps?: ReadonlyArray<unknown>,
): Field<ValueType, ValueType>;

export function useField(
  args: CreateFieldArgs<any, any, any>,
  deps: ReadonlyArray<unknown> = [],
): Field<any, any> {
  return useMemoOne(() => createField(args as any), deps);
}
