import { autorun } from "mobx";

import { createField } from "../createField";
import { createForm } from "../createForm";

/**
 * These tests assert the MobX *integration* itself, not the form logic: that
 * `state` really is observable, that the `computed` getters really became MobX
 * computed values (cached + reactive) rather than plain getters, and that
 * `action` really batches. The rest of the suite reads values synchronously,
 * which would pass even against a non-reactive object — so this file is what
 * backs the supported `mobx` peer range (v4 through v7).
 */

test("field computeds are reactive", () => {
  const field = createField({
    initialValue: "",
    validate(value: string) {
      if (value.length < 3) return { error: "Too short" };
      return { parsed: value };
    },
  });

  const seen: (string | undefined)[] = [];
  const dispose = autorun(() => {
    seen.push(field.computed.error);
  });

  expect(seen).toEqual(["Too short"]);

  field.actions.onChange("abcd");
  expect(seen).toEqual(["Too short", undefined]);

  dispose();
});

test("field computeds are cached, not re-evaluated per read", () => {
  let validateCallCount = 0;
  const field = createField({
    initialValue: "",
    validate(value: string) {
      validateCallCount++;
      return { parsed: value };
    },
  });

  const dispose = autorun(() => {
    // Three reads of the same computed inside one reaction. A MobX computed
    // evaluates once; a plain object getter would run the validator each time.
    void field.computed.parsed;
    void field.computed.parsed;
    void field.computed.parsed;
  });

  expect(validateCallCount).toBe(1);

  field.actions.onChange("next");
  expect(validateCallCount).toBe(2);

  dispose();
});

test("form computeds react to changes in their fields", () => {
  const field = createField({
    initialValue: "",
    validate(value: string) {
      if (!value) return { error: "Required" };
      return { parsed: value };
    },
  });
  const form = createForm({ fields: { field }, onSubmit() {} });

  const seen: boolean[] = [];
  const dispose = autorun(() => {
    seen.push(form.computed.isValid);
  });

  expect(seen).toEqual([false]);

  field.actions.onChange("filled");
  expect(seen).toEqual([false, true]);

  dispose();
});

test("actions batch their mutations into a single reaction run", () => {
  const first = createField({ initialValue: "a" });
  const second = createField({ initialValue: "b" });
  const form = createForm({ fields: { first, second }, onSubmit() {} });

  let runCount = 0;
  const dispose = autorun(() => {
    void form.state.submitCount;
    void form.state.isSubmitting;
    void first.state.wasEverBlurred;
    void second.state.wasEverBlurred;
    runCount++;
  });

  expect(runCount).toBe(1);

  // `submit` mutates five observables across three objects. Batched, that is
  // one reaction run; unbatched it would be one per mutation.
  form.actions.submit();
  expect(runCount).toBe(2);

  dispose();
});
