import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SegmentedControl, type SegmentOption, type SegmentValue } from '../../src/components/segmented-control/segmented-control.js';
import { Field } from '../../src/components/field/field.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
const items:readonly SegmentOption<SegmentValue>[]=[{value:0,label:'Zero'},{value:false,label:'False'},{value:'0',label:'Text zero'}];
describe('segment server contracts',()=>{
  it('preserves false selected radio semantics with deterministic IDs and typed native payload',()=>{
    expect(typeof document).toBe('undefined');const tree=<SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} name="mode"/>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('role="radiogroup"');expect(html).toMatch(/<button[^>]*role="radio"[^>]*aria-checked="true"/);const payload=(html.match(/<input[^>]*>/g)??[]).filter(input=>input.includes('name="mode"'));expect(payload).toHaveLength(3);expect(payload.every(input=>input.includes('type="radio"'))).toBe(true);expect(payload.filter(input=>input.includes('checked=""'))).toHaveLength(1);expect(payload.find(input=>input.includes('checked=""'))).toContain('value="b:false"');expect(html).not.toContain('role="tab"');
  });
  it('multi values submit in item order with native toggle button semantics',()=>{
    const html=renderToString(<SegmentedControl label="Modes" items={items} multiple value={['0',false]} onValueChange={()=>{}} name="modes"/>);expect(html).toContain('aria-pressed="true"');expect(html.match(/type="hidden" name="modes" value="[^"]+"/g)).toEqual(['type="hidden" name="modes" value="b:false"','type="hidden" name="modes" value="s:0"']);
  });
  it('Field owns the composite name and description while choices retain individual names',()=>{
    const html=renderToString(<Field label="Mode" description="Choose"><SegmentedControl nameFromField items={items} value={0} onValueChange={()=>{}}/></Field>);expect(html).toContain('aria-labelledby=');expect(html).toContain('aria-describedby=');expect(html).toContain('Zero');expect(html).not.toContain('data-nova-config-error');
  });
  it('explicit clear text remains provider-local between independent catalogs',()=>{
    const english=renderToString(<NovaProvider locale="en"><SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} allowEmpty/></NovaProvider>);const vietnamese=renderToString(<NovaProvider locale="vi"><SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} allowEmpty/></NovaProvider>);expect(english).toContain('Clear selection');expect(vietnamese).toContain('Bỏ chọn');
  });
  it('required multi includes an unnamed native constraint and a localized group description in SSR',()=>{
    const html=renderToString(<NovaProvider locale="en"><Field label="Modes" required><SegmentedControl nameFromField items={items} multiple value={[]} onValueChange={()=>{}} form="edit" name="modes"/></Field></NovaProvider>);const input=html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0];expect(input).toContain('required=""');expect(input).toContain('form="edit"');expect(input).not.toContain('name=');expect(html).toContain('Required');expect(html).toContain('aria-describedby=');
  });

});
