import { action, observable } from "mobx";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export type ValidationFn<ValueType, ParsedType = ValueType> = (
  value: ValueType
) =>
  | { error?: undefined; parsed: ParsedType }
  | { error: Error | string; parsed?: undefined };

/**
 * The validate function shape used for *inference*. It deliberately leaves the
 * success `parsed` as `unknown` so that a supplied validate function is never
 * constrained to a pre-decided `ParsedType` — instead the parsed/output type is
 * read back out of the function's return via {@link InferValidateParsed}.
 */
export type LooseValidationFn<ValueType> = (
  value: ValueType
) =>
  | { error?: undefined; parsed: unknown }
  | { error: Error | string; parsed?: undefined };

/**
 * Extracts the parsed/output type from a validate function's *success* branch
 * (the one where `error` is absent/undefined). The error branch is ignored, so
 * a `{ error: "..." }` return never leaks `undefined` into the output type —
 * while a success branch that genuinely returns `undefined` is preserved.
 */
export type InferValidateParsed<Fn> = Fn extends (value: never) => infer Result
  ? Result extends { error?: undefined; parsed: infer ParsedType }
    ? ParsedType
    : never
  : never;

type YupLikeSchema<ParsedType> = {
  validateSync(
    value: unknown,
    options?: { abortEarly?: boolean }
  ): ParsedType;
};

export type ValidationSchema<ParsedType = unknown> =
  | StandardSchemaV1<unknown, ParsedType>
  | YupLikeSchema<ParsedType>;

export type InferParsed<Schema, Fallback> =
  Schema extends StandardSchemaV1<unknown, infer Out>
    ? Out
    : Schema extends YupLikeSchema<infer P>
      ? P
      : Fallback;

/**
 * Resolves a field's parsed/output type: from the validation schema if present,
 * otherwise from the validate function's success return, otherwise the input
 * type (a field with no validation parses to its own value).
 */
export type FieldParsed<ValueType, Validate, Schema> =
  Schema extends ValidationSchema<unknown>
    ? InferParsed<Schema, ValueType>
    : Validate extends LooseValidationFn<ValueType>
      ? InferValidateParsed<Validate>
      : ValueType;

export type CreateFieldArgs<
  ValueType,
  Validate extends LooseValidationFn<ValueType> | undefined =
    | LooseValidationFn<ValueType>
    | undefined,
  Schema extends ValidationSchema<unknown> | undefined =
    | ValidationSchema<unknown>
    | undefined,
> = {
  initialValue: ValueType;
  initialError?: string | undefined;
} & (
  | { validate?: undefined; validationSchema?: undefined }
  | { validate: Validate; validationSchema?: undefined }
  | { validate?: undefined; validationSchema: Schema }
);

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
  return (
    typeof schema === "object" && schema !== null && "~standard" in schema
  );
}

function isYupLikeSchema<T>(schema: unknown): schema is YupLikeSchema<T> {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "validateSync" in schema &&
    typeof (schema as { validateSync: unknown }).validateSync === "function"
  );
}

// Overload: a `validate` function is provided — the parsed/output type is read
// out of the function's success-branch return, so narrowing inside `validate`
// (e.g. dropping `undefined`) is reflected in the output type.
export function createField<
  ValueType,
  Validate extends LooseValidationFn<ValueType>,
>(args: {
  initialValue: ValueType;
  initialError?: string | undefined;
  validate: Validate;
  validationSchema?: undefined;
}): Field<ValueType, InferValidateParsed<Validate>>;

// Overload: a validation schema is provided — the parsed/output type is read
// from the schema (Standard Schema output, or Yup's `validateSync` return).
export function createField<
  ValueType,
  Schema extends ValidationSchema<unknown>,
>(args: {
  initialValue: ValueType;
  initialError?: string | undefined;
  validate?: undefined;
  validationSchema: Schema;
}): Field<ValueType, InferParsed<Schema, ValueType>>;

// Overload: no validation — the field parses to its own input value.
export function createField<ValueType>(args: {
  initialValue: ValueType;
  initialError?: string | undefined;
  validate?: undefined;
  validationSchema?: undefined;
}): Field<ValueType, ValueType>;

export function createField(
  args: CreateFieldArgs<any, any, any>
): Field<any, any> {
  const { initialValue, initialError } = args;
  const validate = args.validate as ValidationFn<any, any> | undefined;
  const validationSchema = args.validationSchema as
    | ValidationSchema<any>
    | undefined;

  const runValidation = getValidateFunction<any, any>(
    validate,
    validationSchema
  );

  const state = observable({
    errorOverride: initialError,
    value: initialValue,
    isFocused: false,
    wasEverFocused: false,
    wasEverBlurred: false,
  });

  const computed = observable({
    get parsed(): unknown {
      const result = runValidation(state.value);
      if (result.error) return undefined;
      return result.parsed;
    },

    get isDirty() {
      return JSON.stringify(state.value) !== JSON.stringify(initialValue);
    },

    get error(): string | undefined {
      const { error } = runValidation(state.value);

      if (state.errorOverride) {
        return state.errorOverride;
      }

      if (error instanceof Error && error.name === "ValidationError") {
        const msg: unknown = (error as { message: unknown }).message;
        if (
          msg !== null &&
          typeof msg === "object" &&
          "value" in msg &&
          (msg as { value: unknown }).value !== undefined
        ) {
          return String((msg as { value: unknown }).value);
        }
        if (typeof msg === "string") return msg;
        return String(error);
      }

      if (error instanceof Error) {
        return error.message;
      }

      return error;
    },

    get ifWasEverFocusedThenError(): string | undefined {
      if (!state.wasEverFocused) return undefined;
      if (!computed.error) return undefined;
      return String(computed.error);
    },

    get ifWasEverBlurredThenError(): string | undefined {
      if (!state.wasEverBlurred) return undefined;
      if (!computed.error) return undefined;
      return String(computed.error);
    },
  });

  const actions = {
    onFocus: action(function onFocus() {
      state.isFocused = true;
      state.wasEverFocused = true;
    }),

    onBlur: action(function onBlur() {
      state.isFocused = false;
      state.wasEverBlurred = true;
    }),

    onChange: action(function onChange(value: unknown) {
      if (state.errorOverride) state.errorOverride = undefined;
      state.value = value;
    }),

    setError: action(function setError(value: string | undefined) {
      state.errorOverride = value;
    }),
  };

  const field: Field<any, any> = { state, computed, actions };

  return field;
}

function getValidateFunction<ValueType, ParsedType>(
  validate: ValidationFn<ValueType, ParsedType> | undefined,
  validationSchema: ValidationSchema<ParsedType> | undefined
): ValidationFn<ValueType, ParsedType> {
  if (validate) return validate;

  if (validationSchema) {
    // Prefer Yup's `validateSync` when available — it's guaranteed sync,
    // while Standard Schema's `validate` may return a Promise (Yup itself
    // implements Standard Schema in async mode).
    if (isYupLikeSchema<ParsedType>(validationSchema)) {
      const schema = validationSchema;
      return function validateWithYup(value: ValueType) {
        try {
          const parsed = schema.validateSync(value, { abortEarly: true });
          return { parsed, error: undefined };
        } catch (error) {
          if (error instanceof Error && error.name === "ValidationError") {
            return { parsed: undefined, error };
          }
          throw error;
        }
      };
    }

    if (isStandardSchema(validationSchema)) {
      const schema = validationSchema;
      return function validateWithStandardSchema(value: ValueType) {
        const result = schema["~standard"].validate(value);
        if (result instanceof Promise) {
          throw new TypeError(
            "mobx-easy-form: Standard Schema async validation is not supported. Use a synchronous schema."
          );
        }
        if (result.issues) {
          const message = result.issues[0]?.message ?? "Invalid";
          return { parsed: undefined, error: message };
        }
        return { parsed: result.value as ParsedType, error: undefined };
      };
    }

    throw new TypeError(
      "mobx-easy-form: validationSchema must implement Standard Schema or expose a `validateSync` method (Yup-like)."
    );
  }

  return function passthrough(value: ValueType) {
    return { parsed: value as unknown as ParsedType, error: undefined };
  };
}

export interface Field<ValueType, ParsedType = ValueType> {
  state: {
    errorOverride: undefined | string;
    value: ValueType;
    isFocused: boolean;
    wasEverFocused: boolean;
    wasEverBlurred: boolean;
  };
  computed: {
    readonly parsed: ParsedType | undefined;
    readonly isDirty: boolean;
    readonly error: undefined | string;
    readonly ifWasEverFocusedThenError: undefined | string;
    readonly ifWasEverBlurredThenError: undefined | string;
  };
  actions: {
    onFocus(): void;
    onChange(value: ValueType): void;
    onBlur(): void;
    setError(value: string | undefined): void;
  };
}
