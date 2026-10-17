import {createRef} from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ColorInput} from './index.js';
import {Field} from '../field/index.js';
import {NovaProvider} from '../../providers/nova/index.js';
afterEach(cleanup);
const text=()=>screen.getByRole('textbox') as HTMLInputElement;
const edit=(value:string)=>fireEvent.change(text(),{target:{value}});
const commit=()=>fireEvent.keyDown(text(),{key:'Enter'});
describe('ColorInput',()=>{
 it('case-p2-f04-ac01-unit canonicalizes at commit and retains invalid raw draft without proposals',()=>{
  const change=vi.fn();render(<ColorInput label="Color" onValueChange={change}/>);
  edit('#aBcDeF');expect(change).not.toHaveBeenCalled();expect(text().value).toBe('#aBcDeF');commit();expect(change).toHaveBeenLastCalledWith('#ABCDEF');expect(text().value).toBe('#ABCDEF');
  for(const invalid of ['url(https://example.test/a)','#abc','#12345g','red','#123456789',' #123456']){edit(invalid);commit();expect(text().value).toBe(invalid);expect(text().getAttribute('aria-invalid')).toBe('true');}
  expect(change).toHaveBeenCalledTimes(1);expect(document.querySelector('[style]')).toBeNull();
 });
 it('case-p2-f04-ac02-unit rejects RGBA by default, enables explicit alpha, and clears to null',()=>{
  const change=vi.fn();const view=render(<NovaProvider locale="en"><ColorInput label="Color" onValueChange={change}/></NovaProvider>);
  const picker=document.querySelector('input[type=color]') as HTMLInputElement;expect(picker.value).toBe('#000000');expect(change).not.toHaveBeenCalled();edit('#11223344');commit();expect(change).not.toHaveBeenCalled();
  view.rerender(<NovaProvider locale="en"><ColorInput label="Color" alpha onValueChange={change}/></NovaProvider>);edit('#aabbccdd');commit();expect(change).toHaveBeenLastCalledWith('#AABBCCDD');
  fireEvent.change(picker,{target:{value:'#445566'}});expect(change).toHaveBeenLastCalledWith('#445566DD');fireEvent.click(screen.getByRole('button',{name:'Clear color'}));expect(change).toHaveBeenLastCalledWith(null);expect(text().value).toBe('');expect(picker.value).toBe('#000000');
 });
 it('case-p2-f04-ac03-unit names both inputs independently of decorative swatch and links Field errors',()=>{
  render(<NovaProvider locale="en"><Field label="Brand" description="Choose a color" error="Required" required><ColorInput nameFromField/></Field></NovaProvider>);
  expect(screen.getByRole('textbox',{name:'Brand'})).toBe(text());expect(text().required).toBe(true);expect(text().getAttribute('aria-describedby')).toBeTruthy();expect(text().getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByLabelText('Choose color (RGB)')).toBeTruthy();expect(document.querySelector('.nova-color-input__swatch')?.getAttribute('aria-hidden')).toBe('true');
 });
 it('controlled proposals keep the consumer value, external changes reconcile draft, and unchanged values do not emit twice',()=>{
  const change=vi.fn();const view=render(<ColorInput label="Color" value="#112233" onValueChange={change}/>);edit('#aabbcc');commit();expect(change).toHaveBeenCalledWith('#AABBCC');expect(text().value).toBe('#112233');
  view.rerender(<ColorInput label="Color" value="#445566" onValueChange={change}/>);expect(text().value).toBe('#445566');commit();expect(change).toHaveBeenCalledTimes(1);
 });
 it('captures default once and resets native forms without emission, including cancelled reset',async()=>{
  const change=vi.fn();const view=render(<form><ColorInput label="Color" name="color" defaultValue="#112233" onValueChange={change}/></form>);view.rerender(<form><ColorInput label="Color" name="color" defaultValue="#FFFFFF" onValueChange={change}/></form>);expect(text().value).toBe('#112233');edit('#aabbcc');fireEvent.blur(text());expect(new FormData(document.querySelector('form')!).get('color')).toBe('#AABBCC');
  await act(async()=>{document.querySelector('form')!.reset();await new Promise(r=>setTimeout(r,5));});expect(text().value).toBe('#112233');expect(change).toHaveBeenCalledTimes(1);
  edit('invalid');const cancel=(e:Event)=>e.preventDefault();document.querySelector('form')!.addEventListener('reset',cancel);await act(async()=>{document.querySelector('form')!.reset();await new Promise(r=>setTimeout(r,5));});expect(text().value).toBe('invalid');
 });
 it.each(['disabled','readOnly'] as const)('%s blocks all crafted changes and clear',mode=>{
  const change=vi.fn();render(<NovaProvider locale="en"><ColorInput label="Color" defaultValue="#112233" {...{[mode]:true}} onValueChange={change}/></NovaProvider>);edit('#aabbcc');commit();fireEvent.change(document.querySelector('input[type=color]')!,{target:{value:'#ffffff'}});fireEvent.click(screen.getByRole('button',{name:'Clear color'}));expect(change).not.toHaveBeenCalled();expect(text().value).toBe('#112233');
 });
 it('composition buffers raw input until a later non-composing commit',()=>{
  const change=vi.fn();render(<ColorInput label="Color" onValueChange={change}/>);fireEvent.compositionStart(text());edit('#aabbcc');commit();fireEvent.blur(text());expect(change).not.toHaveBeenCalled();fireEvent.compositionEnd(text());expect(change).not.toHaveBeenCalled();commit();expect(change).toHaveBeenCalledWith('#AABBCC');
 });
 it('mount mode is retained with a deduplicated diagnostic',()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{}),change=vi.fn();const view=render(<ColorInput label="Color" defaultValue="#112233" onValueChange={change}/>);view.rerender(<ColorInput label="Color" value="#AABBCC" onValueChange={change}/>);expect(text().value).toBe('#112233');view.rerender(<ColorInput label="Color" value="#FFFFFF" onValueChange={change}/>);expect(warn.mock.calls.filter(c=>String(c[0]).includes('NOVA_CONTROLLED_MODE_CHANGE'))).toHaveLength(1);warn.mockRestore();
 });
 it('preserves focus/blur/title/style and rejects an empty accessible name',()=>{
  const focus=vi.fn(),blur=vi.fn();const view=render(<ColorInput aria-label="Hex" title="Brand color" style={{margin:1}} onFocus={focus} onBlur={blur}/>);fireEvent.focus(text());fireEvent.blur(text());expect(focus).toHaveBeenCalledTimes(1);expect(blur).toHaveBeenCalledTimes(1);expect(text().title).toBe('Brand color');expect(document.querySelector('.nova-color-input')?.getAttribute('style')).toContain('margin');
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});view.rerender(<ColorInput aria-label=""/>);expect(screen.queryByRole('textbox')).toBeNull();expect(document.querySelector('[data-nova-config-error]')).toBeTruthy();warn.mockRestore();
 });
 it('keeps native submission authoritative after a refused proposal and does not duplicate on blur',()=>{
  const change=vi.fn();render(<form><ColorInput label="Color" name="color" value="#112233" onValueChange={change}/></form>);edit('#aabbcc');commit();fireEvent.blur(text());expect(change).toHaveBeenCalledTimes(1);expect(new FormData(document.querySelector('form')!).get('color')).toBe('#112233');expect((document.querySelector('input[type=color]') as HTMLInputElement).value).toBe('#112233');
 });
 it('preserves controlled mount mode when value is dropped and resets drafts without proposing',async()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{}),change=vi.fn();const view=render(<form><ColorInput label="Color" value="#112233" onValueChange={change}/></form>);view.rerender(<form><ColorInput label="Color" onValueChange={change}/></form>);expect(text().value).toBe('#112233');edit('invalid');await act(async()=>{document.querySelector('form')!.reset();await new Promise(r=>setTimeout(r,5));});expect(text().value).toBe('#112233');expect(change).not.toHaveBeenCalled();warn.mockRestore();
 });
 it('empty commit proposes null, required and invalid drafts constrain the text alternative',()=>{
  const change=vi.fn();render(<ColorInput label="Color" required defaultValue="#112233" onValueChange={change}/>);edit('url(test)');commit();expect(text().checkValidity()).toBe(false);edit('');commit();expect(change).toHaveBeenCalledWith(null);expect(text().validity.valueMissing).toBe(true);
 });
 it('a cancelled blur retains raw text; Clear restores keyboard focus',()=>{
  const change=vi.fn();render(<NovaProvider locale="en"><ColorInput label="Color" defaultValue="#112233" onBlur={e=>e.preventDefault()} onValueChange={change}/></NovaProvider>);edit('#aabbcc');fireEvent.blur(text());expect(change).not.toHaveBeenCalled();expect(text().value).toBe('#aabbcc');const clear=screen.getByRole('button',{name:'Clear color'});clear.focus();fireEvent.click(clear);expect(document.activeElement).toBe(text());expect(change).toHaveBeenLastCalledWith(null);
 });
});
it.each([false,true])('case-p2-f04-r1-unit read-only picker preserves Tab navigation (shift=%s)',shiftKey=>{
 const change=vi.fn();render(<NovaProvider locale="en"><ColorInput label="Read only" readOnly defaultValue="#112233" onValueChange={change}/></NovaProvider>);
 const picker=screen.getByLabelText('Choose color (RGB)') as HTMLInputElement;
 const navigation=new KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true});picker.dispatchEvent(navigation);expect(navigation.defaultPrevented).toBe(false);
 for(const key of ['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Backspace','Delete']){const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});picker.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);}
 fireEvent.change(picker,{target:{value:'#ffffff'}});expect(change).not.toHaveBeenCalled();expect(text().value).toBe('#112233');expect(picker.value).toBe('#112233');
});

// F04-REF: inherited composite root and semantic focus contract.
it('case-p2-f04-ref-object root measures the container and focusRef targets the semantic text input, then clears on unmount',()=>{
 const root=createRef<HTMLElement>(),focus=createRef<HTMLElement>();const view=render(<ColorInput label="Ref color" ref={root} focusRef={focus}/>);
 expect(root.current).toBe(document.querySelector('.nova-color-input'));expect(focus.current).toBe(text());expect(root.current).not.toBe(focus.current);expect(root.current?.contains(focus.current)).toBe(true);
 expect(focus.current).not.toBe(document.querySelector('input[type=color]'));focus.current?.focus();expect(document.activeElement).toBe(text());
 view.unmount();expect(root.current).toBeNull();expect(focus.current).toBeNull();
});
it('case-p2-f04-ref-callback preserves stable attachments and runs React 19 cleanup exactly once for replacement and unmount',()=>{
 const rootClean=vi.fn(),focusClean=vi.fn(),nextRootClean=vi.fn(),nextFocusClean=vi.fn();
 const root=vi.fn((node:HTMLElement|null)=>{expect(node?.className).toContain('nova-color-input');return rootClean;}),focus=vi.fn((node:HTMLElement|null)=>{expect(node).toBe(text());return focusClean;});
 const nextRoot=vi.fn((node:HTMLElement|null)=>{expect(node?.className).toContain('nova-color-input');return nextRootClean;}),nextFocus=vi.fn((node:HTMLElement|null)=>{expect(node).toBe(text());return nextFocusClean;});
 const view=render(<ColorInput label="Ref color" ref={root} focusRef={focus}/>);expect(root).toHaveBeenCalledTimes(1);expect(focus).toHaveBeenCalledTimes(1);
 edit('#aabbcc');commit();view.rerender(<ColorInput label="Ref color" title="Updated" ref={root} focusRef={focus}/>);expect(root).toHaveBeenCalledTimes(1);expect(focus).toHaveBeenCalledTimes(1);expect(rootClean).not.toHaveBeenCalled();expect(focusClean).not.toHaveBeenCalled();
 view.rerender(<ColorInput label="Ref color" ref={nextRoot} focusRef={nextFocus}/>);expect(rootClean).toHaveBeenCalledTimes(1);expect(focusClean).toHaveBeenCalledTimes(1);expect(root).toHaveBeenCalledTimes(1);expect(focus).toHaveBeenCalledTimes(1);expect(nextRoot).toHaveBeenCalledTimes(1);expect(nextFocus).toHaveBeenCalledTimes(1);
 view.unmount();expect(nextRootClean).toHaveBeenCalledTimes(1);expect(nextFocusClean).toHaveBeenCalledTimes(1);expect(nextRoot).toHaveBeenCalledTimes(1);expect(nextFocus).toHaveBeenCalledTimes(1);expect(rootClean).toHaveBeenCalledTimes(1);expect(focusClean).toHaveBeenCalledTimes(1);
});
it('case-p2-f04-ref-legacy sends null to callbacks without cleanup on replacement and unmount',()=>{
 const roots:(HTMLElement|null)[]=[],inputs:(HTMLElement|null)[]=[],nextRoots:(HTMLElement|null)[]=[],nextInputs:(HTMLElement|null)[]=[];
 const root=(node:HTMLElement|null)=>{roots.push(node);},focus=(node:HTMLElement|null)=>{inputs.push(node);},nextRoot=(node:HTMLElement|null)=>{nextRoots.push(node);},nextFocus=(node:HTMLElement|null)=>{nextInputs.push(node);};
 const view=render(<ColorInput label="Ref color" ref={root} focusRef={focus}/>);const wrapper=document.querySelector('.nova-color-input'),input=text();expect(roots).toEqual([wrapper]);expect(inputs).toEqual([input]);
 view.rerender(<ColorInput label="Ref color" ref={nextRoot} focusRef={nextFocus}/>);expect(roots).toEqual([wrapper,null]);expect(inputs).toEqual([input,null]);expect(nextRoots).toEqual([wrapper]);expect(nextInputs).toEqual([input]);
 view.unmount();expect(nextRoots).toEqual([wrapper,null]);expect(nextInputs).toEqual([input,null]);
});
it.each(['readOnly','disabled'] as const)('case-p2-f04-ref-mode %s keeps the primary text target and blocks proposals',mode=>{
 const root=createRef<HTMLElement>(),focus=createRef<HTMLElement>(),change=vi.fn();render(<ColorInput label="Ref color" ref={root} focusRef={focus} defaultValue="#112233" {...{[mode]:true}} onValueChange={change}/>);
 expect(root.current).toBe(document.querySelector('.nova-color-input'));expect(focus.current).toBe(text());focus.current?.focus();expect(document.activeElement===text()).toBe(mode==='readOnly');edit('#aabbcc');commit();expect(change).not.toHaveBeenCalled();expect(text().value).toBe('#112233');
});
it('case-p2-f04-ref-internal ref replacement preserves Clear focus and native form reset without an extra proposal',async()=>{
 const first=createRef<HTMLElement>(),second=createRef<HTMLElement>(),change=vi.fn();const view=render(<NovaProvider locale="en"><form><ColorInput label="Ref color" focusRef={first} name="color" defaultValue="#112233" onValueChange={change}/></form></NovaProvider>);
 view.rerender(<NovaProvider locale="en"><form><ColorInput label="Ref color" focusRef={second} name="color" defaultValue="#112233" onValueChange={change}/></form></NovaProvider>);expect(first.current).toBeNull();expect(second.current).toBe(text());
 edit('#aabbcc');commit();expect(new FormData(document.querySelector('form')!).get('color')).toBe('#AABBCC');const clear=screen.getByRole('button',{name:'Clear color'});clear.focus();fireEvent.click(clear);expect(document.activeElement).toBe(second.current);expect(text().value).toBe('');expect(change).toHaveBeenCalledTimes(2);
 await act(async()=>{document.querySelector('form')!.reset();await new Promise(r=>setTimeout(r,5));});expect(second.current).toBe(text());expect(text().value).toBe('#112233');expect(new FormData(document.querySelector('form')!).get('color')).toBe('#112233');expect(change).toHaveBeenCalledTimes(2);
});
