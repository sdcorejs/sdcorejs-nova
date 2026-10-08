import { Field } from '../../../src/components/field/index.js';
import { Input, InputGroup, Textarea } from '../../../src/components/input/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

export default function InputScenario() {
  return (
    <NovaProvider>
      <Field label="Email" description="Email công việc">
        <Input nameFromField data-testid="email" type="email" autoComplete="email" />
      </Field>
      <Field label="Giá">
        <InputGroup start={<span>₫</span>}>
          <Input nameFromField data-testid="price" inputMode="numeric" />
        </InputGroup>
      </Field>
      <Textarea label="Ghi chú" data-testid="notes" />
    </NovaProvider>
  );
}

// after a native form reset, typing the
// pre-reset value again must still emit. Rendered outside #root so the original cases keep
// their scope. `mount` takes precedence over the default export and renders it too.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function ResetForm() {
  const [inputLog, setInputLog] = useState<string[]>([]);
  const [textareaLog, setTextareaLog] = useState<string[]>([]);
  return (
    <NovaProvider>
      <form data-testid="reset-form">
        <Input label="Mã" data-testid="reset-input" defaultValue="abc" onValueChange={(next) => setInputLog((log) => [...log, next])} />
        <Textarea label="Ghi chú mã" data-testid="reset-textarea" defaultValue="abc" onValueChange={(next) => setTextareaLog((log) => [...log, next])} />
      </form>
      <output data-testid="reset-input-log" data-log={JSON.stringify(inputLog)} />
      <output data-testid="reset-textarea-log" data-log={JSON.stringify(textareaLog)} />
    </NovaProvider>
  );
}

export function mount(container: HTMLElement): void {
  createRoot(container).render(<InputScenario />);
  const extra = document.createElement('div');
  extra.id = 'repair-reset';
  container.after(extra);
  createRoot(extra).render(<ResetForm />);
}
