import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { useField } from "../useField";
import { useForm } from "../useForm";

test("form.onSubmit captures values correctly", () => {
  const log = jest.fn();
  render(<Form log={log} />);

  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("inc"));
  fireEvent.click(screen.getByText("submit"));

  expect(log).toBeCalledWith(3);
});

const cache = { form: undefined as any };

export function Form({ log }: { log: (args: any) => any }) {
  const [n, setN] = useState(0);

  const form = useForm({
    onSubmit() {
      log(n);
    },
  });

  if (!cache.form) cache.form = form;

  if (cache.form !== form) throw new Error("Form changed during render");

  const field = useField({
    id: "name",
    form,
    initialValue: "",
  });

  return (
    <div>
      <input
        value={field.state.value}
        onChange={(e) => field.actions.onChange(e.target.value)}
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
