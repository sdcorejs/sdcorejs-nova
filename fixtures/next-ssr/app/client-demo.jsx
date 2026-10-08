'use client';
// Consumer client boundary: callbacks live here (functions are not serializable
// from a Server Component, architecture §7).
import { useEffect, useState } from 'react';

import { Alert } from '@sdcorejs/nova/alert';
import { Button } from '@sdcorejs/nova/button';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { Field } from '@sdcorejs/nova/field';
import { Input } from '@sdcorejs/nova/input';
import { RadioGroup } from '@sdcorejs/nova/radio-group';
import { useNovaTheme } from '@sdcorejs/nova/theme';

export function ClientDemo() {
  const { resolvedTheme } = useNovaTheme();
  const [hydrated, setHydrated] = useState(false);
  const [clicks, setClicks] = useState(0);
  useEffect(() => setHydrated(true), []);

  return (
    <section aria-label="Tương tác">
      <span data-testid="hydrated" data-hydrated={hydrated ? 'true' : 'false'} />
      <output data-testid="resolved-theme">{resolvedTheme}</output>
      <Button onClick={() => setClicks((count) => count + 1)}>Tăng</Button>
      <output data-testid="clicks">{clicks}</output>
      <Field label="Email"><Input nameFromField type="email" autoComplete="email" /></Field>
      <Checkbox label="Đồng ý" name="agree" />
      <RadioGroup label="Lựa chọn" name="choice" options={[{ value: 1, label: 'Một' }, { value: 2, label: 'Hai' }]} />
      <Alert tone="info" title="Thông báo" onDismiss={() => {}}>Nội dung.</Alert>
    </section>
  );
}
