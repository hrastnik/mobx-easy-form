import { action, observable, runInAction } from "mobx";
import { isPromise } from "./isPromise";
import type { Field } from "./createField";
import { mapValues } from "./mapValues";

/**
 * A map of field key -> Field. The keys you choose here become the keys of
 * `onSubmit`'s `values`/`rawValues`, and the source of full type inference.
 */
export type FormFields = Record<string, Field<any, any>>;

/**
 * The parsed ("output") value of every field, keyed by the field's key in the
 * form. Read from each field's declared `Output` type (the second type
 * parameter of {@link Field}). The error-sentinel `undefined` that
 * `field.computed.parsed` adds is intentionally stripped here — `onSubmit` only
 * runs when the form is valid — while any genuinely-optional `Output` (e.g.
 * `number | undefined`) is preserved.
 */
export type FieldValues<Fields extends FormFields> = {
  [Key in keyof Fields]: Fields[Key] extends Field<any, infer ParsedType>
    ? ParsedType
    : never;
};

/**
 * The raw ("input") value of every field, keyed by the field's key in the form.
 * This is what {@link Field.state.value} holds for each field.
 */
export type FieldRawValues<Fields extends FormFields> = {
  [Key in keyof Fields]: Fields[Key] extends Field<infer ValueType, any>
    ? ValueType
    : never;
};

export type OnSubmitArg<Fields extends FormFields = FormFields> = {
  fields: Fields;
  rawValues: FieldRawValues<Fields>;
  values: FieldValues<Fields>;
};

export type OnSubmitFn<Fields extends FormFields = FormFields> = (
  props: OnSubmitArg<Fields>
) => unknown;

export type CreateFormArgs<Fields extends FormFields = FormFields> = {
  fields: Fields;
  onSubmit: OnSubmitFn<Fields>;
};

export type Form<Fields extends FormFields = FormFields> = ReturnType<
  typeof createForm<Fields>
>;

export function createForm<Fields extends FormFields>({
  fields,
  onSubmit,
}: CreateFormArgs<Fields>) {

  const state = observable({
    isSubmitting: false,
    valuesAtLastSubmit: undefined as undefined | string,
    submitCount: 0,
  });

  const computed = observable({
    get isDirty() {
      return Object.values(fields).some((field) => field.computed.isDirty);
    },
    get errorList() {
      return Object.values(fields)
        .map((field) => field.computed.error)
        .filter((error) => error !== undefined);
    },
    get isError() {
      return Object.values(fields).some((field) => !!field.computed.error);
    },
    get isValid() {
      return !this.isError;
    },
    get valueList() {
      return String(Object.values(fields).map((field) => field.state.value));
    },

    get isChangedSinceLastSubmit() {
      if (state.submitCount === 0) return this.isDirty;
      return this.valueList !== state.valuesAtLastSubmit;
    },
  });

  const actions = {
    submit: action(function submit() {
      state.isSubmitting = true;
      state.submitCount++;
      state.valuesAtLastSubmit = computed.valueList;

      for (const fieldId in fields) {
        const field = fields[fieldId];
        field.state.wasEverFocused = true;
        field.state.wasEverBlurred = true;
      }

      if (computed.isError) {
        state.isSubmitting = false;
        return;
      }

      const maybePromise = onSubmit({
        fields,
        rawValues: mapValues(
          fields,
          (field) => field.state.value
        ) as FieldRawValues<Fields>,
        values: mapValues(
          fields,
          (field) => field.computed.parsed
        ) as FieldValues<Fields>,
      });

      if (isPromise(maybePromise)) {
        return Promise.resolve(maybePromise).finally(() => {
          runInAction(() => {
            state.isSubmitting = false;
          });
        });
      }

      runInAction(() => {
        state.isSubmitting = false;
      });

      return maybePromise;
    }),
  };

  return { fields, state, computed, actions };
}
