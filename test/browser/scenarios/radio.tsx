import { Field } from '../../../src/components/field/index.js';
import { RadioGroup } from '../../../src/components/radio-group/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

const OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS', disabled: true },
  { value: 'push', label: 'Thông báo đẩy' },
];

export default function RadioScenario() {
  return (
    <>
      <NovaProvider>
        <button type="button" data-testid="before">Trước</button>
        <form data-testid="form" onSubmit={(event) => event.preventDefault()}>
          <Field label="Kênh nhận tin" required>
            <RadioGroup nameFromField name="channel" options={OPTIONS} orientation="horizontal" />
          </Field>
          <button type="submit" data-testid="submit">Gửi</button>
        </form>
      </NovaProvider>
      <NovaProvider dir="rtl" locale="en">
        <RadioGroup label="RTL" name="rtl" options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two' }]} defaultValue={1} orientation="horizontal" />
      </NovaProvider>
    </>
  );
}

// the checked
// radio is CSS-hidden by the consumer; focusing the first invalid control must land on a
// visible enabled radio. Rendered outside #root so the original cases keep their scope.
// `mount` takes precedence over the default export and renders the original scenario too.
import { createRoot } from 'react-dom/client';
import { focusFirstInvalid } from '../../../src/components/field/index.js';

function HiddenCheckedRadio() {
  return (
    <NovaProvider>
      <style>{'[data-testid="hidden-checked-form"] .nova-radio[data-checked] { display: none; }'}</style>
      <form data-testid="hidden-checked-form" onSubmit={(event) => event.preventDefault()}>
        <Field label="Kênh dự phòng" error="Chọn kênh khác">
          <RadioGroup nameFromField name="backup" options={[{ value: 'a', label: 'Kênh A' }, { value: 'b', label: 'Kênh B' }]} defaultValue="a" />
        </Field>
        <button
          type="button"
          data-testid="focus-invalid"
          onClick={(event) => {
            const form = event.currentTarget.form!;
            const target = focusFirstInvalid(form);
            form.dataset.focused = target?.getAttribute('aria-labelledby') ?? 'none';
          }}
        >
          Đến lỗi đầu tiên
        </button>
      </form>
    </NovaProvider>
  );
}

export function mount(container: HTMLElement): void {
  createRoot(container).render(<RadioScenario />);
  const extra = document.createElement('div');
  extra.id = 'repair-hidden-checked';
  container.after(extra);
  createRoot(extra).render(<HiddenCheckedRadio />);
}
