import { createField } from "../createField";
import { createForm } from "../createForm";

import { number, string } from "yup";

test("create a form an submit", () => {
  const onSubmit = jest.fn();

  const form = createForm({ onSubmit });
  form.actions.submit();
  expect(onSubmit).toBeCalled();
});

test("add field to form and check default values", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ id: "id", form, initialValue: undefined });

  expect(form.state.isSubmitting).toBe(false);
  expect(form.state.submitCount).toBe(0);
  expect(form.state.valuesAtLastSubmit).toBe(undefined);

  expect(field.state.errorOverride).toBe(undefined);
  expect(field.state.isFocused).toBe(false);
  expect(field.state.value).toBe(undefined);
  expect(field.state.wasEverBlurred).toBe(false);
  expect(field.state.wasEverFocused).toBe(false);

  expect(field.computed.isDirty).toBe(false);
  expect(field.computed.error).toBe(undefined);
  expect(field.computed.parsed).toBe(undefined);
  expect(field.computed.ifWasEverBlurredThenError).toBe(undefined);
  expect(field.computed.ifWasEverFocusedThenError).toBe(undefined);
});

test("initial value works", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
  });

  expect(field.state.value).toBe("");
});

test("initial error works", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    id: "id",
    form,
    initialValue: "",
    initialError: "Error",
  });

  expect(field.computed.error).toBe("Error");
});

test("onChange works", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: "" });

  expect(field.state.value).toBe("");
  expect(field.computed.isDirty).toBe(false);

  field.actions.onChange("A");

  expect(field.state.value).toBe("A");
  expect(field.computed.isDirty).toBe(true);
});

test("onFocus and onBlur work", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: "" });

  expect(field.state.isFocused).toBe(false);
  expect(field.state.wasEverFocused).toBe(false);
  expect(field.state.wasEverBlurred).toBe(false);

  field.actions.onFocus();

  expect(field.state.isFocused).toBe(true);
  expect(field.state.wasEverFocused).toBe(true);
  expect(field.state.wasEverBlurred).toBe(false);

  field.actions.onBlur();

  expect(field.state.isFocused).toBe(false);
  expect(field.state.wasEverFocused).toBe(true);
  expect(field.state.wasEverBlurred).toBe(true);
});

test("parsed returns parsed number", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
    validationSchema: number(),
  });

  expect(field.computed.parsed).toBe(undefined);
  field.actions.onChange("20");
  expect(field.computed.parsed).toBe(20);
});

test("isSubmitting works when onSubmit is an async function", async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const form = createForm({
    onSubmit() {
      return delay(0);
    },
  });
  createField({ form, id: "id", initialValue: "" });

  expect(form.state.isSubmitting).toBe(false);

  const promise = form.actions.submit();
  expect(form.state.isSubmitting).toBe(true);
  await promise;
  expect(form.state.isSubmitting).toBe(false);
});

test("submitCount works", async () => {
  const form = createForm({ onSubmit() {} });
  createField({ form, id: "id", initialValue: "" });

  expect(form.state.submitCount).toBe(0);
  form.actions.submit();
  expect(form.state.submitCount).toBe(1);
  form.actions.submit();
  expect(form.state.submitCount).toBe(2);
});

test("form.isChangedSinceLastSubmit works", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: "" });

  expect(form.computed.isChangedSinceLastSubmit).toBe(false);
  field.actions.onChange("A");
  expect(form.computed.isChangedSinceLastSubmit).toBe(true);
  form.actions.submit();
  expect(form.computed.isChangedSinceLastSubmit).toBe(false);
  field.actions.onChange("A"); // Call on change with same value
  expect(form.computed.isChangedSinceLastSubmit).toBe(false);
  field.actions.onChange("AB");
  expect(form.computed.isChangedSinceLastSubmit).toBe(true);
});

test("form.computed.dirty works", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: "" });

  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange("A");
  expect(form.computed.isDirty).toBe(true);
});

test("form.computed.dirty works with arrays", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: [] as string[] });
  field.state.value;
  field.computed.parsed;
  expect(form.computed.isDirty).toBe(false);
  field.state.value.push("A");
  expect(form.computed.isDirty).toBe(true);
  field.state.value.pop();
  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange(["A"]);
  expect(form.computed.isDirty).toBe(true);
  field.actions.onChange([]);
  expect(form.computed.isDirty).toBe(false);
});

test("form.computed.dirty works with objects", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({ form, id: "id", initialValue: { a: 1 } });

  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange({ a: 1 });
  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange({ a: 2 });
  expect(form.computed.isDirty).toBe(true);
  field.actions.onChange({ a: 1 });
  expect(form.computed.isDirty).toBe(false);
});

test("Custom validation works", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
    validate(value) {
      if (value !== "YES") {
        return { error: "Invalid", parsed: undefined };
      }
      return { error: undefined, parsed: value };
    },
  });

  expect(form.computed.isValid).toBe(false);
  expect(form.computed.isError).toBe(true);
  expect(form.computed.errorList).toEqual(["Invalid"]);
  field.actions.onChange("YES");
  expect(form.computed.isValid).toBe(true);
  expect(form.computed.isError).toBe(false);
  expect(form.computed.errorList).toEqual([]);
});

test("Yup validation works", async () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
    validationSchema: string().required("Invalid").oneOf(["YES"], "Invalid"),
  });

  expect(form.computed.isValid).toBe(false);
  expect(form.computed.isError).toBe(true);
  expect(form.computed.errorList).toEqual(["Invalid"]);
  field.actions.onChange("YES");
  expect(form.computed.isValid).toBe(true);
  expect(form.computed.isError).toBe(false);
  expect(form.computed.errorList).toEqual([]);
});

test("validate can't be set along with validationSchema", async () => {
  const form = createForm({ onSubmit() {} });
  createField({
    form,
    id: "id-0",
    initialValue: "",
    validate: (value) => ({ error: undefined, parsed: value }),
    validationSchema: undefined,
  });

  createField({
    form,
    id: "id-1",
    initialValue: "",
    validate: undefined,
    validationSchema: undefined,
  });

  createField({
    form,
    id: "id-2",
    initialValue: "",
    // validate: undefined,
    validationSchema: undefined,
  });

  // @ts-expect-error
  createField({
    form,
    id: "id-3",
    initialValue: "",
    validate: (value) => ({ error: undefined, parsed: value }),
    validationSchema: string(),
  });

  createField({
    form,
    id: "id-4",
    initialValue: "",
    validate: undefined,
    validationSchema: string(),
  });

  createField({
    form,
    id: "id-5",
    initialValue: "",
    // validate: undefined,
    validationSchema: string(),
  });

  createField({
    form,
    id: "id-6",
    initialValue: "",
    validate: (value) => ({ error: undefined, parsed: value }),
    // validationSchema: undefined,
  });

  createField({
    form,
    id: "id-7",
    initialValue: "",
    validate: undefined,
    // validationSchema: undefined,
  });

  createField({
    form,
    id: "id-8",
    initialValue: "",
    // validationSchema: undefined,
  });

  createField({
    form,
    id: "id-9",
    initialValue: "",
    // validate: undefined,
    // validationSchema: undefined,
  });
});
