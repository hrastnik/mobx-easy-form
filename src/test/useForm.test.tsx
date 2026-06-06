import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { useField } from "../useField";
import { useForm } from "../useForm";

test("form.onSubmit captures values correctly", () => {
  const log = vi.fn();
  render(<Form log={log} />);

  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("submit"));

  expect(log).toHaveBeenCalledWith(3);
});

const cache = { form: undefined as any };

export function Form({ log }: { log: (args: any) => any }) {
  const [n, setN] = useState(0);

  const name = useField({
    initialValue: "",
  });

  const form = useForm({
    fields: { name },
    onSubmit() {
      log(n);
    },
  });

  if (!cache.form) cache.form = form;

  if (cache.form !== form) throw new Error("Form changed during render");

  return (
    <div>
      <input
        value={name.state.value}
        onChange={(e) => name.actions.onChange(e.target.value)}
      />

      <button id="inc" onClick={() => setN((n) => n + 1)}>
        inc
      </button>

      <button id="submit" onClick={() => form.actions.submit()}>
        submit
      </button>
    </div>
  );
}

test("useForm infers value types from the field record", () => {
  const log = vi.fn();
  render(<TypedForm log={log} />);

  fireEvent.click(screen.getByText("submit"));

  expect(log).toHaveBeenCalledWith({ name: "Ada", age: 5 });
});

function TypedForm({ log }: { log: (args: any) => any }) {
  const name = useField({ initialValue: "Ada" });
  const age = useField({
    initialValue: "5",
    validate: (value) => ({ error: undefined, parsed: Number(value) }),
  });

  const form = useForm({
    fields: { name, age },
    onSubmit({ values }) {
      const inferred: { name: string; age: number } = values;
      log(inferred);
    },
  });

  return (
    <button id="submit" onClick={() => form.actions.submit()}>
      submit
    </button>
  );
}
