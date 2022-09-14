import { action, observable } from "mobx";
import type { AnySchema } from "yup";

export type ValidationFn<ValueType, ParsedType> = (
  value: ValueType
) =>
  | { error?: undefined; parsed: ParsedType }
  | { error: Error | string; parsed?: undefined };

export type CreateFieldArgs<
  ValueType,
  ParsedType = string,
  YupSchema extends AnySchema<any, any, ParsedType> = AnySchema<
    any,
    any,
    ParsedType
  >
> = {
  id: string;
  initialValue: ValueType;
  initialError?: undefined | string;
  form: {
    actions: {
      add(field: any): any;
      submit(): any;
    };
  };
} & (
  | {
      validate?: ValidationFn<ValueType, ParsedType>;
      validationSchema?: undefined;
    }
  | {
      validate?: undefined;
      validationSchema?: YupSchema;
    }
);

export function createField<ValueType = string, ParsedType = string>({
  id,
  initialValue,
  initialError,
  form,
  ...validationProps
}: CreateFieldArgs<ValueType, ParsedType>): Field<ValueType, ParsedType> {
  function getValidateFunction(): ValidationFn<ValueType, ParsedType> {
    if ("validate" in validationProps && validationProps.validate) {
      return validationProps.validate;
    }

    if (
      "validationSchema" in validationProps &&
      validationProps.validationSchema
    ) {
      return function validate(value: ValueType | string) {
        if (!validationProps.validationSchema)
          throw new Error("Missing validation schema");

        try {
          const parsed = validationProps.validationSchema.validateSync(
            value === "" ? undefined : value,
            { abortEarly: true }
          );
          return { parsed, error: undefined };
        } catch (error) {
          if (error instanceof Error && error.name === "ValidationError") {
            return { parsed: undefined, error };
          }
          throw error;
        }
      };
    }

    return function validate(value: ValueType) {
      return { parsed: value as unknown as ParsedType, error: undefined };
    };
  }

  const runValidation = getValidateFunction();

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
      const { error, parsed } = runValidation(state.value);

      if (error) return undefined;

      return parsed;
    },

    get isDirty() {
      // TODO: Add ability to provide custom equality function.
      return JSON.stringify(state.value) !== JSON.stringify(initialValue);
    },

    get error() {
      const { error } = runValidation(state.value);

      if (state.errorOverride) {
        return state.errorOverride;
      }

      if (error instanceof Error && error.name === "ValidationError") {
        const err = error as any;
        return String(err.message?.value ?? err.message ?? error);
      }

      if (error instanceof Error) {
        return error.message;
      }

      return error;
    },

    get ifWasEverFocusedThenError() {
      if (!state.wasEverFocused) return undefined;
      if (!computed.error) return undefined;
      return String(computed.error);
    },

    get ifWasEverBlurredThenError() {
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

  const field = { state, computed, actions };

  form.actions.add(field);

  return field;
}

export interface Field<ValueType = string, ParsedType = string> {
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
    onChange(value: ValueType | undefined): void;
    onBlur(): void;
    setError(value: string | undefined): void;
  };
}
