import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from '../../src/components/stepper/stepper.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
describe('step progress server contracts',()=>{
  it('renders deterministic consumer statuses without browser state or callback',()=>{
    expect(typeof document).toBe('undefined');const change=vi.fn();const tree=<Stepper value="b" onValueChange={change} steps={[{id:'a',label:'Start',status:'complete'},{id:'b',label:'Review',status:'error'}]}/>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toMatch(/<ol[^>]*role="list"/);expect(html).toContain('aria-current="step"');expect(html).toContain('Hoàn thành');expect(html).toContain('Lỗi');expect(change).not.toHaveBeenCalled();
  });
  it('isolates catalog and selected progress between provider roots',()=>{
    const steps=[{id:'one',label:'First',status:'pending' as const}];const english=renderToString(<NovaProvider locale="en"><Stepper defaultValue="one" steps={steps}/></NovaProvider>);const vietnamese=renderToString(<NovaProvider locale="vi"><Stepper steps={steps}/></NovaProvider>);expect(english).toContain('Pending');expect(vietnamese).toContain('Chờ thực hiện');expect(english).not.toContain('Chờ thực hiện');
  });
  it('preserves explicit empty-string IDs without manufacturing progress status',()=>{
    const html=renderToString(<Stepper defaultValue="" steps={[{id:'',label:'Empty identity'}]} interactive/>);expect(html).toContain('aria-current="step"');expect(html).not.toContain('nova-stepper__status');expect(html).not.toContain('nova-stepper__connector');
  });
  it('allows a complete legacy catalog and step-status overrides',()=>{
    const html=renderToString(<NovaProvider locale="en" strings={{navigation:{stepError:'Needs attention'}}}><Stepper steps={[{id:'one',label:'Review',status:'error'}]}/></NovaProvider>);expect(html).toContain('Needs attention');
  });
});
