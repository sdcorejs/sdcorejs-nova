import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {NovaProvider} from '@sdcorejs/nova/theme';
import {AppShell,Sidebar} from '@sdcorejs/nova/app-shell';
import {ToastProvider} from '@sdcorejs/nova/toast';
import {ConfirmProvider} from '@sdcorejs/nova/confirm';
import {Button} from '@sdcorejs/nova/button';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Breadcrumb} from '@sdcorejs/nova/breadcrumb';
import {Brand,Glyph,Navigation,labels,type Locale} from './navigation.js';
import {FormsPage} from './pages/forms-page.js';
import {ActionsPage} from './pages/actions-page.js';
import {NavigationPage} from './pages/navigation-page.js';
import {OverlaysPage} from './pages/overlays-page.js';
import {DatesPage} from './pages/dates-page.js';
import {FeedbackPage} from './pages/feedback-page.js';
import {UtilitiesPage} from './pages/utilities-page.js';
import {DataPage} from './pages/data-page.js';
import {FilesPage} from './pages/files-page.js';
import {JobsPage} from './pages/jobs-page.js';
import {parseShowcaseHash,subscribeHash} from './routes.js';
const snapshot=()=>location.hash;
export function ShowcaseApp(){
 const [theme,setTheme]=useState<'light'|'dark'>(()=>new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light');
 const [locale,setLocale]=useState<Locale>('vi'),[menu,setMenu]=useState(false);
 // Resolve at close time: breakpoint observers can notify parent/child in either order.
 const sidebarReturn=useMemo(()=>({get current(){if(typeof document==='undefined')return null;const trigger=document.querySelector<HTMLElement>('.showcase .nova-sidebar__trigger');return trigger&&trigger.getClientRects().length>0?trigger:document.getElementById('showcase-content');}}),[]);
 const hash=useSyncExternalStore(subscribeHash,snapshot,()=>''),route=parseShowcaseHash(hash),t=(vi:string,en:string)=>locale==='vi'?vi:en;
 useEffect(()=>{if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/forms');},[]);
 const pages={forms:<FormsPage locale={locale}/>,actions:<ActionsPage locale={locale}/>,navigation:<NavigationPage locale={locale}/>,overlays:<OverlaysPage locale={locale}/>,dates:<DatesPage locale={locale}/>,feedback:<FeedbackPage locale={locale}/>,data:<DataPage locale={locale}/>,files:<FilesPage locale={locale}/>,jobs:<JobsPage locale={locale}/>,utilities:<UtilitiesPage locale={locale}/>};
 const header=<div className="showcase-topbar"><div className="showcase-header-left"><Breadcrumb className="showcase-breadcrumb" items={[{id:'components',label:'Component'},{id:route,label:route==='not-found'?t('Không tìm thấy','Not found'):labels[locale][route]}]}/></div><div className="showcase-actions"><Button variant="ghost" aria-label={locale==='vi'?'English':'Tiếng Việt'} onClick={()=>setLocale(locale==='vi'?'en':'vi')}><span className="showcase-language-full">{locale==='vi'?'English':'Tiếng Việt'}</span><span className="showcase-language-short" aria-hidden="true">{locale==='vi'?'EN':'VI'}</span></Button><Button variant="ghost" className="showcase-theme-button" aria-label={theme==='light'?t('Giao diện tối','Dark theme'):t('Giao diện sáng','Light theme')} onClick={()=>setTheme(theme==='light'?'dark':'light')}><Glyph name={theme==='light'?'moon':'sun'}/><span>{theme==='light'?t('Giao diện tối','Dark theme'):t('Giao diện sáng','Light theme')}</span></Button></div></div>;
 return <NovaProvider theme={theme} locale={locale}><ToastProvider><ConfirmProvider><AppShell className="showcase" data-testid="nova-showcase" mainId="showcase-content" skipLabel={t('Đến nội dung chính','Skip to content')} header={header} sidebar={<Sidebar label={t('Khám phá Nova','Explore Nova')} triggerLabel={t('Mở menu','Open menu')} mobileValue={menu} onMobileValueChange={setMenu} returnFocusRef={sidebarReturn}><div className="showcase-sidebar"><Brand/><Navigation current={route} locale={locale} onSelect={()=>setMenu(false)}/><div className="showcase-sidebar-bottom"><div className="showcase-mini-note"><span className="showcase-status-dot"/>{t('P2 cục bộ · chờ duyệt thủ công','Local P2 · manual review pending')}</div><div className="showcase-sidebar-identity"><Avatar name="Nguyễn An" size="sm"/><div><strong>Nguyễn An</strong><span>{t('Không gian cá nhân','Personal workspace')}</span></div></div></div></div></Sidebar>}>
 {route==='not-found'?<><h1>{t('Không tìm thấy trang','Page not found')}</h1><p>{t('Trang này chưa có trong showcase.','This page is not available.')}</p><a href="#/forms">{t('Về Biểu mẫu','Back to Forms')}</a></>:pages[route]}
 <footer className="showcase-page-footer"><span>{t('Nova · Core UI cho trải nghiệm hằng ngày','Nova · Core UI for everyday experiences')}</span><span>{t('Bản mẫu cục bộ','Local preview')}</span></footer>
 </AppShell></ConfirmProvider></ToastProvider></NovaProvider>;
}
