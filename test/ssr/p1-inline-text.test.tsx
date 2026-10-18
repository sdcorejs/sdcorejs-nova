import { renderToString } from 'react-dom/server';
import { describe,expect,it,vi } from 'vitest';
import { Field } from '../../src/components/field/field.js';
import { InlineText } from '../../src/components/inline-text/inline-text.js';

describe('inline native input server markup',()=>{
  it('default values and native form metadata render without focus or callbacks',()=>{expect(typeof document).toBe('undefined');const change=vi.fn(),ref=vi.fn(),html=renderToString(<InlineText label="Name" defaultValue="seed" name="draft" form="owner" autoComplete="name" onValueChange={change} ref={ref}/>);expect(html).toContain('value="seed"');expect(html).toContain('name="draft"');expect(html).toContain('form="owner"');expect(html).toContain('size="2"');expect(change).not.toHaveBeenCalled();expect(ref).not.toHaveBeenCalled();});
  it('a Field owns the one composite control name and error description without DOM effects',()=>{const html=renderToString(<Field label="Name" description="Hint" error="Error"><InlineText nameFromField defaultValue="seed" clearable/></Field>);const controlId=/<input\b[^>]*\sid="([^"]+)"/u.exec(html)?.[1];expect(controlId).toBeTruthy();expect(html).toContain('for="'+controlId+'"');expect(html).toContain('aria-describedby=');expect(html).toContain('aria-invalid="true"');expect((html.match(/<input/g)??[]).length).toBe(1);expect(html).not.toContain('<script');});
});
