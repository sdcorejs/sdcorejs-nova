import {useEffect,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import {IconButton} from '@sdcorejs/nova/button';
export function Glyph({name}:{name:string}){
 const paths:Record<string,string>={menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M18 6 6 18',form:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h4',button:'M5 8h14v8H5zM10 12h4',display:'M4 5h16v14H4zM4 10h16M10 10v9',feedback:'M5 4h14v12H9l-4 4zM8 8h8M8 12h5',guide:'M5 4h6v16H5zM11 4h8v16h-8',sun:'M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1 1M17 17l1 1M6 18l1-1M17 7l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',moon:'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11',arrow:'M7 17 17 7M7 7h10v10'};
 return <svg className="showcase-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[name]??paths.form} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function Brand(){return <div className="showcase-brand"><span className="showcase-mark" aria-hidden="true">n</span><span>Nova<span className="showcase-brand-caption">Core UI</span></span></div>;}
export function Navigation({onSelect,current}:{onSelect?:()=>void;current:boolean}){
 return <nav aria-label="Component showcase" className="showcase-navigation">
  <p className="showcase-nav-heading">NỀN TẢNG</p>
  <div className="showcase-nav-unavailable" aria-disabled="true" title="Chưa dựng trang này trong bản mẫu"><Glyph name="guide"/><span>Bắt đầu</span></div>
  <p className="showcase-nav-heading showcase-nav-heading--second">COMPONENT</p>
  <a className="showcase-nav-active" href="#/forms" aria-current={current?'page':undefined} onClick={onSelect}><Glyph name="form"/><span>Biểu mẫu</span></a>
  {([["button","Nút bấm"],["display","Hiển thị"],["feedback","Phản hồi"]] as const).map(([icon,label])=><div key={icon} className="showcase-nav-unavailable" aria-disabled="true" title="Chưa dựng trang này trong bản mẫu"><Glyph name={icon}/><span>{label}</span></div>)}
 </nav>;
}

export function MobileMenu({current}:{current:boolean}){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;const modal=dialog.current;if(!modal)return;
  const oldOverflow=document.body.style.overflow,originalOpener=opener.current;document.body.style.overflow='hidden';modal.showModal();close.current?.focus();
  const backdrop=(event:MouseEvent)=>{if(event.target!==modal)return;const box=modal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)setOpen(false);};
  modal.addEventListener('click',backdrop);
  const resize=()=>{if(innerWidth>=900)setOpen(false);};window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('resize',resize);modal.removeEventListener('click',backdrop);if(modal.open)modal.close();document.body.style.overflow=oldOverflow;if(originalOpener?.getClientRects().length)originalOpener.focus();else document.getElementById('showcase-content')?.focus();};
 },[open]);
 function containFocus(event:KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;const elements=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');if(!elements?.length)return;
  const first=elements[0],last=elements[elements.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
 return <><IconButton ref={opener} className="showcase-menu-button" variant="ghost" size="lg" label="Mở menu" icon={<Glyph name="menu"/>} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}/>
 <dialog ref={dialog} aria-labelledby="mobile-menu-title" className="showcase-mobile-dialog" onCancel={event=>{event.preventDefault();setOpen(false);}} onClose={()=>setOpen(false)} onKeyDown={containFocus}>
 <div className="showcase-dialog-heading"><Brand/><IconButton ref={close} variant="ghost" size="lg" label="Đóng menu" icon={<Glyph name="close"/>} onClick={()=>setOpen(false)}/></div><h2 id="mobile-menu-title" className="showcase-dialog-title">Khám phá Nova</h2><Navigation current={current} onSelect={()=>setOpen(false)}/><div className="showcase-mini-note"><span className="showcase-status-dot"/>Bản mẫu cần duyệt</div>
 </dialog></>;
}
