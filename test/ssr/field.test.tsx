import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FieldControlError, useFieldControl } from '../../src/components/field/field.js';
import { Field } from '../../src/components/field/index.js';
import { NovaProvider } from '../../src/providers/nova/index.js';
import type { ControlProps } from '../../src/types/index.js';

function TestInput(props: ControlProps) {
  const control = useFieldControl(props, { component: 'TestInput' });
  if (!control.ok) return <FieldControlError code={control.code} component="TestInput" />;
  return control.wrap(<input id={control.id} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid || undefined} required={control.required} />);
}

const attributes = (html: string, name: string) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map((match) => match[1]!);

describe('Field SSR (F01-AC03, INV-003)', () => {
  it('two Fields have unique SSR ids wired label→control and describedby→text', () => {
    const html = renderToString(
      <NovaProvider>
        <Field label="A" description="da"><TestInput nameFromField /></Field>
        <Field label="B" error="eb" required><TestInput nameFromField /></Field>
      </NovaProvider>,
    );
    const ids = attributes(html, 'id');
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
    const fors = attributes(html, 'for');
    expect(fors).toHaveLength(2);
    for (const target of fors) expect(ids).toContain(target);
    for (const list of attributes(html, 'aria-describedby')) {
      for (const id of list.split(' ')) expect(ids).toContain(id);
    }
    expect(html).toContain('required=""');
    expect(html).toContain('aria-invalid="true"');
  });

  it('server render is deterministic for the same tree', () => {
    const tree = <Field label="A"><TestInput nameFromField /></Field>;
    expect(renderToString(tree)).toBe(renderToString(tree));
  });

  it('configuration errors are decided at render (server = client)', () => {
    const html = renderToString(<NovaProvider locale="en"><TestInput nameFromField /></NovaProvider>);
    expect(html).not.toContain('<input');
    expect(html).toContain('Configuration error');
  });
});
