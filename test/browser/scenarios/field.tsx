import { FieldControlError, useFieldControl } from '../../../src/components/field/field.js';
import { Field } from '../../../src/components/field/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';
import type { ControlProps } from '../../../src/types/index.js';

function TestInput(props: ControlProps) {
  const control = useFieldControl(props, { component: 'TestInput' });
  if (!control.ok) return <FieldControlError code={control.code} component="TestInput" />;
  return control.wrap(
    <input id={control.id} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid || undefined} required={control.required} />,
  );
}

const LABELS = [
  'Email',
  'Địa chỉ thư điện tử dùng để nhận thông báo quan trọng về tài khoản',
  'Supercalifragilisticexpialidocious-identifier-label',
];

export default function FieldScenario() {
  return (
    <NovaProvider>
      {LABELS.map((label, index) => (
        <Field key={label} label={label} required description={index === 1 ? 'Mô tả ngắn' : undefined} error={index === 2 ? 'Bắt buộc nhập' : undefined}>
          <TestInput nameFromField />
        </Field>
      ))}
    </NovaProvider>
  );
}
