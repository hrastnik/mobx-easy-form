import { createField, type Field } from "../createField";
import { createForm } from "../createForm";

import { number, string } from "yup";

test("create a form an submit", () => {
  const onSubmit = vi.fn();

  const form = createForm({ fields: {}, onSubmit });
  form.actions.submit();
  expect(onSubmit).toBeCalled();
});

test("add field to form and check default values", () => {
  const field = createField({ initialValue: undefined });
  const form = createForm({ fields: { field }, onSubmit() {} });

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

test("the form exposes the exact field instances passed to it", () => {
  const field = createField({ initialValue: "" });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.fields.field).toBe(field);
});

test("initial value works", () => {
  const field = createField({ initialValue: "" });
  createForm({ fields: { field }, onSubmit() {} });

  expect(field.state.value).toBe("");
});

test("initial error works", () => {
  const field = createField({ initialValue: "", initialError: "Error" });
  createForm({ fields: { field }, onSubmit() {} });

  expect(field.computed.error).toBe("Error");
});

test("onChange works", () => {
  const field = createField({ initialValue: "" });
  createForm({ fields: { field }, onSubmit() {} });

  expect(field.state.value).toBe("");
  expect(field.computed.isDirty).toBe(false);

  field.actions.onChange("A");

  expect(field.state.value).toBe("A");
  expect(field.computed.isDirty).toBe(true);
});

test("onFocus and onBlur work", () => {
  const field = createField({ initialValue: "" });
  createForm({ fields: { field }, onSubmit() {} });

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

test("onSubmit receives typed values, rawValues and fields", () => {
  const spy = vi.fn();

  const name = createField({ initialValue: "Ada" });
  // `.required()` makes the parsed output `number` (not `number | undefined`).
  const age = createField({
    initialValue: "42",
    validationSchema: number().required(),
  });

  const form = createForm({
    fields: { name, age },
    onSubmit({ values, rawValues, fields }) {
      // Type-level assertions: the following must compile.
      const nameValue: string = values.name;
      const ageValue: number = values.age;
      const rawAge: string = rawValues.age;
      const nameField: Field<string> = fields.name;

      // @ts-expect-error `age` parses to a number, not a string.
      const wrong: string = values.age;
      // @ts-expect-error there is no `email` field.
      void values.email;

      void wrong;
      spy({ nameValue, ageValue, rawAge, nameField });
    },
  });

  form.actions.submit();

  expect(spy).toHaveBeenCalledWith({
    nameValue: "Ada",
    ageValue: 42,
    rawAge: "42",
    nameField: name,
  });
});

test("a genuinely-optional output keeps `undefined` in `values`", () => {
  const spy = vi.fn();

  // A field whose parsed output is legitimately `number | undefined`: an empty
  // value validates successfully and parses to `undefined`.
  const age = createField({
    initialValue: "",
    validate: (
      value
    ):
      | { error: undefined; parsed: number | undefined }
      | { error: string; parsed?: undefined } => {
      if (value === "") return { error: undefined, parsed: undefined };
      return { error: undefined, parsed: Number(value) };
    },
  });

  const form = createForm({
    fields: { age },
    onSubmit({ values }) {
      // Type-level assertion: `undefined` is preserved here, so this compiles
      // while `const n: number = values.age` would not.
      const ageValue: number | undefined = values.age;
      spy(ageValue);
    },
  });

  form.actions.submit();
  expect(spy).toHaveBeenCalledWith(undefined);
});

test("validate narrows the output type (strips input-only undefined)", () => {
  const spy = vi.fn();

  const plans = "family" as "family" | "single" | undefined;

  const familyStatus = createField({
    initialValue: plans, // input is `"family" | "single" | undefined`
    validate(value) {
      if (!value) {
        return { error: "required" };
      } else {
        return { parsed: value }; // value is narrowed to `"family" | "single"`
      }
    },
  });

  // The input type still allows undefined...
  const inputValue: "family" | "single" | undefined = familyStatus.state.value;
  void inputValue;

  const form = createForm({
    fields: { familyStatus },
    onSubmit({ values }) {
      // ...but the parsed output type does not.
      const output: "family" | "single" = values.familyStatus;
      // @ts-expect-error `undefined` is no longer part of the output type.
      const wrong: undefined = values.familyStatus;
      void wrong;
      spy(output);
    },
  });

  form.actions.submit();
  expect(spy).toHaveBeenCalledWith("family");
});

test("parsed returns parsed number", () => {
  const field = createField({ initialValue: "", validationSchema: number() });
  createForm({ fields: { field }, onSubmit() {} });

  expect(field.computed.parsed).toBe(undefined);
  field.actions.onChange("20");
  expect(field.computed.parsed).toBe(20);
});

test("isSubmitting works when onSubmit is an async function", async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const field = createField({ initialValue: "" });
  const form = createForm({
    fields: { field },
    onSubmit() {
      return delay(0);
    },
  });

  expect(form.state.isSubmitting).toBe(false);

  const promise = form.actions.submit();
  expect(form.state.isSubmitting).toBe(true);
  await promise;
  expect(form.state.isSubmitting).toBe(false);
});

test("submitCount works", async () => {
  const field = createField({ initialValue: "" });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.state.submitCount).toBe(0);
  form.actions.submit();
  expect(form.state.submitCount).toBe(1);
  form.actions.submit();
  expect(form.state.submitCount).toBe(2);
});

test("form.isChangedSinceLastSubmit works", async () => {
  const field = createField({ initialValue: "" });
  const form = createForm({ fields: { field }, onSubmit() {} });

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
  const field = createField({ initialValue: "" });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange("A");
  expect(form.computed.isDirty).toBe(true);
});

test("form.computed.dirty works with arrays", async () => {
  const field = createField({ initialValue: [] as string[] });
  const form = createForm({ fields: { field }, onSubmit() {} });
  void field.state.value;
  void field.computed.parsed;
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
  const field = createField({ initialValue: { a: 1 } });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange({ a: 1 });
  expect(form.computed.isDirty).toBe(false);
  field.actions.onChange({ a: 2 });
  expect(form.computed.isDirty).toBe(true);
  field.actions.onChange({ a: 1 });
  expect(form.computed.isDirty).toBe(false);
});

test("Custom validation works", async () => {
  const field = createField({
    initialValue: "",
    validate(value) {
      if (value !== "YES") {
        return { error: "Invalid", parsed: undefined };
      }
      return { error: undefined, parsed: value };
    },
  });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.computed.isValid).toBe(false);
  expect(form.computed.isError).toBe(true);
  expect(form.computed.errorList).toEqual(["Invalid"]);
  field.actions.onChange("YES");
  expect(form.computed.isValid).toBe(true);
  expect(form.computed.isError).toBe(false);
  expect(form.computed.errorList).toEqual([]);
});

test("cross-field validation works by closing over another field", () => {
  const password = createField({ initialValue: "" });
  const confirmPassword = createField({
    initialValue: "",
    validate(value) {
      if (value === password.state.value) {
        return { error: undefined, parsed: value };
      }
      return { error: "Passwords must match", parsed: undefined };
    },
  });
  const form = createForm({
    fields: { password, confirmPassword },
    onSubmit() {},
  });

  password.actions.onChange("hunter2");
  expect(form.computed.isError).toBe(true);
  confirmPassword.actions.onChange("hunter2");
  expect(form.computed.isError).toBe(false);
});

test("Yup validation works", async () => {
  const field = createField({
    initialValue: "",
    validationSchema: string().required("Invalid").oneOf(["YES"], "Invalid"),
  });
  const form = createForm({ fields: { field }, onSubmit() {} });

  expect(form.computed.isValid).toBe(false);
  expect(form.computed.isError).toBe(true);
  expect(form.computed.errorList).toEqual(["Invalid"]);
  field.actions.onChange("YES");
  expect(form.computed.isValid).toBe(true);
  expect(form.computed.isError).toBe(false);
  expect(form.computed.errorList).toEqual([]);
});

test("validate can't be set along with validationSchema", async () => {
  createField({
    initialValue: "",
    validate: (value) => ({ error: undefined, parsed: value }),
    validationSchema: undefined,
  });

  createField({
    initialValue: "",
    validate: undefined,
    validationSchema: undefined,
  });

  createField({
    initialValue: "",
    // validate: undefined,
    validationSchema: undefined,
  });

  createField({
    initialValue: "",
    // @ts-expect-error validate and validationSchema can't be set together
    validate: (value) => ({ error: undefined, parsed: value }),
    validationSchema: string(),
  });

  createField({
    initialValue: "",
    validate: undefined,
    validationSchema: string(),
  });

  createField({
    initialValue: "",
    // validate: undefined,
    validationSchema: string(),
  });

  createField({
    initialValue: "",
    validate: (value) => ({ error: undefined, parsed: value }),
    // validationSchema: undefined,
  });

  createField({
    initialValue: "",
    validate: undefined,
    // validationSchema: undefined,
  });

  createField({
    initialValue: "",
    // validationSchema: undefined,
  });

  createField({
    initialValue: "",
    // validate: undefined,
    // validationSchema: undefined,
  });
});
