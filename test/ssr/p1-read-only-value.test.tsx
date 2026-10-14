import { renderToString } from 'react-dom/server';
import { describe,expect,it,vi } from 'vitest';
import { ReadOnlyValue,View } from '../../src/components/read-only-value/read-only-value.js';

describe('readonly value server composition',()=>{
  it('slots receive the original object without library data lookup or serialization',()=>{const value={id:0,name:'An'},renderer=vi.fn(raw=><strong>{raw.name}</strong>);const html=renderToString(<View label="Name" value={value} display="unused" renderValue={renderer}/>);expect(renderer).toHaveBeenCalledWith(value);expect(renderer.mock.calls[0]?.[0]).toBe(value);expect(html).toContain('<dt>Name</dt>');expect(html).toContain('<strong>An</strong>');expect(html).not.toContain('id');});
  it('false/zero remain text and unsafe navigation remains a readable span',()=>{expect(renderToString(<ReadOnlyValue value={false} display={false}/>)).toContain('false');const html=renderToString(<ReadOnlyValue value={0} display={0} href="javascript:alert(1)"/>);expect(html).toContain('0');expect(html).not.toContain('<a');expect(html).not.toContain('<input');});
});
