import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';
import {NovaProvider} from '../../providers/nova/index.js';
import {FileUpload} from './index.js';
afterEach(cleanup);
const file=(size:number,name='same.txt',type='text/plain')=>new File([new Uint8Array(size)],name,{type});
function picker(){return screen.getByLabelText('Choose files') as HTMLInputElement;}
function view(props:Partial<React.ComponentProps<typeof FileUpload>>={}){const onFiles=vi.fn();const result=render(<NovaProvider locale="en"><FileUpload multiple onFiles={onFiles} {...props}/></NovaProvider>);return {...result,onFiles};}
describe('FileUpload',()=>{
 it('case-p2-u01-ac01-unit exact bytes and zero accepted; max+1 rejected; raw duplicate-name identities survive',()=>{
  const {onFiles}=view({maxFileBytes:4});const zero=file(0),exact=file(4),over=file(5);fireEvent.change(picker(),{target:{files:[zero,exact,over]}});expect(onFiles).toHaveBeenCalledTimes(1);expect(onFiles.mock.calls[0]![0]).toEqual([zero,exact]);expect(onFiles.mock.calls[0]![0][0]).toBe(zero);expect(onFiles.mock.calls[0]![0][1]).toBe(exact);expect(screen.getByRole('alert').textContent).toBe('A file exceeds the allowed size.');expect(picker().value).toBe('');
 });
 it('accept gates extensions/MIME/wildcards consistently for picker and drop',()=>{
  const {onFiles,container}=view({accept:'.TXT,image/*,application/pdf'});const text=file(1,'A.TXT',''),image=file(1,'a.png','image/png'),pdf=file(1,'a.pdf','application/pdf'),bad=file(1,'a.exe','application/octet-stream');fireEvent.drop(container.querySelector('.nova-file-upload')!,{dataTransfer:{files:[text,image,pdf,bad]}});expect(onFiles.mock.calls[0]![0]).toEqual([text,image,pdf]);expect(screen.getByRole('alert').textContent).toBe('A file type is not accepted.');expect(picker().accept).toBe('.TXT,image/*,application/pdf');
 });
 it('zero count/byte limits are real limits and maxFiles does not accumulate business state',()=>{
  const onFiles=vi.fn();const {rerender}=render(<NovaProvider locale="en"><FileUpload multiple maxFiles={0} onFiles={onFiles}/></NovaProvider>);fireEvent.change(picker(),{target:{files:[file(0)]}});expect(onFiles).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toBe('Too many files selected.');rerender(<NovaProvider locale="en"><FileUpload multiple maxFiles={1} maxFileBytes={0} onFiles={onFiles}/></NovaProvider>);const zero=file(0);fireEvent.change(picker(),{target:{files:[zero]}});fireEvent.change(picker(),{target:{files:[zero]}});expect(onFiles).toHaveBeenCalledTimes(2);fireEvent.change(picker(),{target:{files:[file(1)]}});expect(onFiles).toHaveBeenCalledTimes(2);
 });
 it('single selection rejects multi-file drops; invalid bounds show safe configuration error',()=>{
  const {onFiles,container,rerender}=view({multiple:false});fireEvent.drop(container.querySelector('.nova-file-upload')!,{dataTransfer:{files:[file(1),file(2)]}});expect(onFiles).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toBe('Too many files selected.');rerender(<FileUpload onFiles={onFiles} maxFileBytes={-1}/>);expect(screen.getByText('Không thể cấu hình chọn tệp.')).toBeDefined();expect(screen.queryByRole('button')).toBeNull();
 });
 it('case-p2-u01-ac03-unit keyboard activates chooser, disabled blocks chooser/drop and visible errors describe native input',async()=>{
  const user=userEvent.setup();const {onFiles,container,rerender}=view({errors:['Consumer rejection']});const input=picker(),click=vi.spyOn(input,'click');const button=screen.getByRole('button',{name:'Choose files or drop them here'});await user.tab();expect(document.activeElement).toBe(button);await user.keyboard('{Enter} ');expect(click).toHaveBeenCalledTimes(2);expect(input.getAttribute('aria-invalid')).toBe('true');expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Consumer rejection');rerender(<NovaProvider locale="en"><FileUpload disabled onFiles={onFiles}/></NovaProvider>);fireEvent.drop(container.querySelector('.nova-file-upload')!,{dataTransfer:{files:[file(1)]}});fireEvent.change(picker(),{target:{files:[file(1)]}});await user.click(screen.getByRole('button'));expect(onFiles).not.toHaveBeenCalled();expect(picker().disabled).toBe(true);
 });
 it('consumer surface props/ref reach root; vi fallback is readable and empty selection emits nothing',()=>{
  const ref=vi.fn(),onFiles=vi.fn();const {container}=render(<FileUpload ref={ref} className="consumer" data-testid="upload" onFiles={onFiles}/>);expect(ref).toHaveBeenCalledWith(container.firstChild);expect(screen.getByTestId('upload').classList.contains('consumer')).toBe(true);expect(screen.getByRole('button').textContent).toBe('Chọn tệp hoặc thả vào đây');fireEvent.change(screen.getByLabelText('Chọn tệp'),{target:{files:[]}});expect(onFiles).not.toHaveBeenCalled();
 });
});

import {createRef,type Ref} from 'react';
describe('FileUpload inherited focusRef',()=>{
 it('attaches an HTMLElement object ref to the visible chooser independently of root and native input; programmatic focus activates both keys',async()=>{
  const focus=createRef<HTMLElement>(),root=createRef<HTMLDivElement>(),user=userEvent.setup();const {unmount}=view({focusRef:focus,ref:root});const button=screen.getByRole('button'),input=picker(),click=vi.spyOn(input,'click');
  expect(focus.current).toBe(button);expect(root.current).toBe(button.parentElement);expect(focus.current).not.toBe(input);expect(input.hidden).toBe(true);focus.current?.focus();expect(document.activeElement).toBe(button);await user.keyboard('{Enter} ');expect(click).toHaveBeenCalledTimes(2);unmount();expect(focus.current).toBeNull();expect(root.current).toBeNull();
 });
 it('honors React 19 cleanup, stable rerenders, replacement, legacy null and object reset across invalid/disabled/unmount transitions',()=>{
  const disposal=vi.fn(),callback=vi.fn((node:HTMLElement|null)=>{expect(node).not.toBeNull();return disposal;}),legacy=vi.fn((node:HTMLElement|null)=>{void node;}),object=createRef<HTMLElement>(),root=createRef<HTMLDivElement>(),onFiles=vi.fn();
  const draw=(focusRef:Ref<HTMLElement>,maxFileBytes=4,disabled=false)=><NovaProvider locale="en"><FileUpload focusRef={focusRef} ref={root} onFiles={onFiles} maxFileBytes={maxFileBytes} disabled={disabled}/></NovaProvider>;
  const {rerender,unmount}=render(draw(callback));const button=screen.getByRole('button'),container=root.current;expect(callback).toHaveBeenCalledExactlyOnceWith(button);rerender(draw(callback,8,true));expect(callback).toHaveBeenCalledTimes(1);expect(disposal).not.toHaveBeenCalled();expect(button).toHaveProperty('disabled',true);expect(root.current).toBe(container);
  rerender(draw(legacy));expect(disposal).toHaveBeenCalledTimes(1);expect(callback).toHaveBeenCalledTimes(1);expect(legacy).toHaveBeenCalledExactlyOnceWith(button);rerender(draw(object));expect(legacy.mock.calls).toEqual([[button],[null]]);expect(object.current).toBe(button);
  rerender(draw(object,-1));expect(object.current).toBeNull();expect(screen.queryByRole('button')).toBeNull();expect(root.current).not.toBeNull();rerender(draw(object));expect(object.current).toBe(screen.getByRole('button'));unmount();expect(object.current).toBeNull();expect(root.current).toBeNull();expect(disposal).toHaveBeenCalledTimes(1);
 });
});
