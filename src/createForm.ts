import { action, observable, runInAction } from "mobx";
import { isPromise } from "./isPromise";
import type { Field } from "./createField";
import { mapValues } from "./mapValues";

export type OnSubmitArg = {
  fields: Record<string, Field<any>>;
  rawValues: Record<string, any>;
  values: Record<string, any>;
};

export type OnSubmitFn = (props: OnSubmitArg) => any;

export type CreateFormArgs = {
  onSubmit: OnSubmitFn;
};

export type Form = ReturnType<typeof createForm>;

export function createForm({ onSubmit }: CreateFormArgs) {
  const fields = observable({}) as Record<string, Field<any>>;

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
    add(field: Field<any>) {
      fields[field.state.id] = field;
    },

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
        rawValues: mapValues(fields, (field) => field.state.value),
        values: mapValues(fields, (field) => field.computed.parsed),
      });

      if (isPromise(maybePromise)) {
        return Promise.resolve(maybePromise).finally(() => {
          runInAction(() => {
            state.isSubmitting = false;
          });
        });
      } else {
        runInAction(() => {
          state.isSubmitting = false;
        });
      }

      [].map;
      return maybePromise;
    }),
  };

  return { fields, state, computed, actions };
}
