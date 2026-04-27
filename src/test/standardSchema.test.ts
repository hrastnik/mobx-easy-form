import { z } from "zod";
import { createField } from "../createField";
import { createForm } from "../createForm";

test("Zod (Standard Schema) validation surfaces error message", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
    validationSchema: z.literal("YES", { error: "Invalid" }),
  });

  expect(form.computed.isValid).toBe(false);
  expect(form.computed.isError).toBe(true);
  expect(form.computed.errorList).toEqual(["Invalid"]);

  field.actions.onChange("YES");

  expect(form.computed.isValid).toBe(true);
  expect(form.computed.isError).toBe(false);
  expect(form.computed.errorList).toEqual([]);
});

test("Zod parses raw value to coerced type", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "age",
    initialValue: "",
    validationSchema: z.coerce.number().min(1),
  });

  expect(field.computed.parsed).toBe(undefined);
  field.actions.onChange("42");
  expect(field.computed.parsed).toBe(42);
});

test("ParsedType is inferred from a Standard Schema", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "n",
    initialValue: "",
    validationSchema: z.coerce.number(),
  });

  field.actions.onChange("7");
  const parsed: number | undefined = field.computed.parsed;
  expect(parsed).toBe(7);
});

test("Async Standard Schema validators throw a clear error", () => {
  const form = createForm({ onSubmit() {} });
  const field = createField({
    form,
    id: "id",
    initialValue: "",
    validationSchema: z.string().refine(async () => true),
  });

  expect(() => field.computed.parsed).toThrow(/async validation/i);
});
