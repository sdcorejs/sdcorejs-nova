import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReadOnlyValue, View } from './read-only-value.js';

afterEach(cleanup);

describe('consumer-owned readonly values', () => {
  it('renderValue receives the untouched object and controls its display without JSON serialization', () => {
    const value={id:0,name:'An'},renderer=vi.fn(raw => <strong>{raw.name}</strong>);
    const view=render(<ReadOnlyValue value={value} display="fallback" renderValue={renderer}/>);
    expect(renderer).toHaveBeenCalledWith(value);expect(renderer.mock.calls[0]?.[0]).toBe(value);
    expect(view.container.textContent).toBe('An');expect(view.container.textContent).not.toContain('id');
  });
  it('zero and false remain visible and null/empty display has a plain placeholder', () => {
    const zero=render(<ReadOnlyValue value={0} display={0}/>);expect(zero.container.textContent).toBe('0');
    const falsy=render(<ReadOnlyValue value={false} display={false}/>);expect(falsy.container.textContent).toBe('false');
    const missing=render(<ReadOnlyValue value={null} display={null}/>);expect(missing.container.textContent).toBe('—');
    const empty=render(<ReadOnlyValue value="" display=""/>);expect(empty.container.textContent).toBe('—');
  });
  it('View exposes a semantic definition term/value relationship without a disabled input', () => {
    const view=render(<View label="Tên" value="An" display="An"/>);
    expect(view.container.querySelector('dl dt')?.textContent).toBe('Tên');
    expect(view.container.querySelector('dl dd')?.textContent).toBe('An');expect(view.container.querySelector('input')).toBeNull();
  });
  it('safe links navigate through the existing allowlist and unsafe schemes stay readable plain text', () => {
    const safe=render(<ReadOnlyValue value="An" display="An" href="/people/1"/>);expect(safe.getByRole('link').getAttribute('href')).toBe('/people/1');
    safe.unmount();
    const unsafe=render(<ReadOnlyValue value="An" display="An" href={'java\nscript:alert(1)'}/>);expect(unsafe.queryByRole('link')).toBeNull();expect(unsafe.container.textContent).toBe('An');
  });
  it('standalone optional labels also use semantic term/value markup', () => {
    const view=render(<ReadOnlyValue label="Mã" value={0} display={0}/>);expect(view.container.querySelector('dt')?.textContent).toBe('Mã');expect(view.container.querySelector('dd')?.textContent).toBe('0');
  });
});
