import { action, observable } from "mobx";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export type ValidationFn<ValueType, ParsedType = ValueType> = (
  value: ValueType
) =>
  | { error?: undefined; parsed: ParsedType }
  | { error: Error | string; parsed?: undefined };

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

export type CreateFieldArgs<
  ValueType,
  ParsedType = ValueType,
  Schema extends ValidationSchema<ParsedType> | undefined =
    | ValidationSchema<ParsedType>
    | undefined,
> = {
  id: string;
  initialValue: ValueType;
  initialError?: string | undefined;
  form: {
    actions: {
      add(field: Field<any, any>): void;
      submit(): unknown;
    };
  };
} & (
  | { validate?: undefined; validationSchema?: undefined }
  | {
      validate: ValidationFn<ValueType, ParsedType>;
      validationSchema?: undefined;
    }
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

export function createField<
  ValueType,
  Schema extends ValidationSchema<unknown> | undefined = undefined,
  ParsedType = InferParsed<Schema, ValueType>,
>(
  args: CreateFieldArgs<
    ValueType,
    ParsedType,
    Schema extends ValidationSchema<ParsedType> ? Schema : undefined
  >
): Field<ValueType, ParsedType> {
  const { id, initialValue, initialError, form } = args;
  const validate = args.validate;
  const validationSchema = args.validationSchema as
    | ValidationSchema<ParsedType>
    | undefined;

  const runValidation = getValidateFunction<ValueType, ParsedType>(
    validate,
    validationSchema
  );

  const state = observable({
    id,
    errorOverride: initialError,
    value: initialValue,
    isFocused: false,
    wasEverFocused: false,
    wasEverBlurred: false,
  });

  const computed = observable({
    get parsed(): ParsedType | undefined {
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

    onChange: action(function onChange(value: ValueType) {
      if (state.errorOverride) state.errorOverride = undefined;
      state.value = value;
    }),

    setError: action(function setError(value: string | undefined) {
      state.errorOverride = value;
    }),
  };

  const field: Field<ValueType, ParsedType> = { state, computed, actions };

  form.actions.add(field);

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
    id: string;
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
