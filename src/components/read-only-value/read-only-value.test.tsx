import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
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
    for(const display of [null,undefined,'']){
      const view=render(<ReadOnlyValue value={display} display={display}/>),glyph=view.container.querySelector('[aria-hidden="true"]');
      expect(glyph?.textContent).toBe('--');expect(view.container.textContent).toBe('--Không có dữ liệu');expect(view.container.textContent).not.toContain('—');view.unmount();
    }
  });
  it('Q20 the empty placeholder is hidden from assistive technology, which reads the localized feedback.unavailable text',()=>{
    const english=render(<NovaProvider locale="en"><View label="Manager" value={null} display={null}/></NovaProvider>);
    const dd=english.container.querySelector('dd')!;expect(dd.querySelector('[aria-hidden="true"]')?.textContent).toBe('--');
    expect(dd.querySelector('.nova-visually-hidden')?.textContent).toBe('Unavailable');english.unmount();
    const custom=render(<NovaProvider locale="vi" strings={{feedback:{unavailable:'Chưa cập nhật'}}}><ReadOnlyValue value="" display=""/></NovaProvider>);
    expect(custom.container.textContent).toBe('--Chưa cập nhật');
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
