import { z } from "zod";
import { createField } from "../createField";
import { createForm } from "../createForm";

test("Zod (Standard Schema) validation surfaces error message", () => {
  const field = createField({
    initialValue: "",
    validationSchema: z.literal("YES", { error: "Invalid" }),
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

test("Zod parses raw value to coerced type", () => {
  const field = createField({
    initialValue: "",
    validationSchema: z.coerce.number().min(1),
  });
  createForm({ fields: { field }, onSubmit() {} });

  expect(field.computed.parsed).toBe(undefined);
  field.actions.onChange("42");
  expect(field.computed.parsed).toBe(42);
});

test("ParsedType is inferred from a Standard Schema", () => {
  const field = createField({
    initialValue: "",
    validationSchema: z.coerce.number(),
  });
  createForm({ fields: { field }, onSubmit() {} });

  field.actions.onChange("7");
  const parsed: number | undefined = field.computed.parsed;
  expect(parsed).toBe(7);
});

test("Async Standard Schema validators throw a clear error", () => {
  const field = createField({
    initialValue: "",
    validationSchema: z.string().refine(async () => true),
  });
  createForm({ fields: { field }, onSubmit() {} });

  expect(() => field.computed.parsed).toThrow(/async validation/i);
});
