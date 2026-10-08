import {useEffect,useState,useSyncExternalStore} from 'react';
import {NovaProvider} from '@sdcorejs/nova/theme';
import {Button} from '@sdcorejs/nova/button';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Breadcrumb} from '@sdcorejs/nova/breadcrumb';
import {Brand,Glyph,MobileMenu,Navigation} from './navigation.js';
import {FormsPage} from './pages/forms-page.js';
import {parseShowcaseHash,subscribeHash} from './routes.js';
const snapshot=()=>location.hash;
export function ShowcaseApp(){
 const [theme,setTheme]=useState<'light'|'dark'>(()=>new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light');
 const hash=useSyncExternalStore(subscribeHash,snapshot,()=>''),route=parseShowcaseHash(hash);
 useEffect(()=>{if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/forms');},[]);
 return <NovaProvider theme={theme} locale="vi"><div className="showcase" data-testid="nova-showcase">
 <a className="showcase-skip" href="#/forms" onClick={event=>{event.preventDefault();const main=document.getElementById('showcase-content');main?.focus();main?.scrollIntoView();}}>Đến nội dung chính</a>
 <aside className="showcase-sidebar" aria-label="Điều hướng showcase"><Brand/><Navigation current={route==='forms'}/><div className="showcase-sidebar-bottom"><div className="showcase-mini-note"><span className="showcase-status-dot"/>Bản mẫu cần duyệt</div><div className="showcase-sidebar-identity"><Avatar name="Nguyễn An" size="sm"/><div><strong>Nguyễn An</strong><span>Không gian cá nhân</span></div></div></div></aside>
 <div className="showcase-workspace"><header className="showcase-topbar"><div className="showcase-header-left"><MobileMenu current={route==='forms'}/><Breadcrumb className="showcase-breadcrumb" items={[{id:'components',label:'Component'},{id:route,label:route==='forms'?'Biểu mẫu':'Không tìm thấy'}]}/></div><Button variant="ghost" className="showcase-theme-button" aria-label={theme==='light'?'Giao diện tối':'Giao diện sáng'} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}><Glyph name={theme==='light'?'moon':'sun'}/><span>{theme==='light'?'Giao diện tối':'Giao diện sáng'}</span></Button></header>
 <main id="showcase-content" className="showcase-main" tabIndex={-1}>{route==='forms'?<FormsPage/>:<><h1>Không tìm thấy trang</h1><p>Trang này chưa có trong showcase P0.</p><a href="#/forms">Về Biểu mẫu</a></>}</main>
 <footer className="showcase-page-footer"><span>Nova · Core UI cho trải nghiệm hằng ngày</span><span>Bản phác thảo trực quan</span></footer></div>
 </div></NovaProvider>;
}
