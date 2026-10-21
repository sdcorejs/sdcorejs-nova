import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {NovaProvider} from '@sdcorejs/nova/theme';
import {AppShell,Sidebar} from '@sdcorejs/nova/app-shell';
import {ToastProvider} from '@sdcorejs/nova/toast';
import {ConfirmProvider} from '@sdcorejs/nova/confirm';
import {Button} from '@sdcorejs/nova/button';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Breadcrumb} from '@sdcorejs/nova/breadcrumb';
import {Brand,Navigation,labels,type Locale} from './navigation.js';
import {Icon,translator} from './ui.js';
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
 const hash=useSyncExternalStore(subscribeHash,snapshot,()=>''),route=parseShowcaseHash(hash),t=translator(locale);
 useEffect(()=>{if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/forms');},[]);
 const pages={forms:<FormsPage locale={locale} onLocaleChange={setLocale}/>,actions:<ActionsPage locale={locale}/>,navigation:<NavigationPage locale={locale}/>,overlays:<OverlaysPage locale={locale}/>,dates:<DatesPage locale={locale}/>,feedback:<FeedbackPage locale={locale}/>,data:<DataPage locale={locale}/>,files:<FilesPage locale={locale}/>,jobs:<JobsPage locale={locale}/>,utilities:<UtilitiesPage locale={locale}/>};
 const dark=theme==='dark',themeLabel=dark?t('Giao diện sáng','Light theme'):t('Giao diện tối','Dark theme');
 const header=<div className="showcase-topbar">
  <Breadcrumb className="showcase-breadcrumb" items={[{id:'nova',label:'Nova',href:'#/forms'},{id:route,label:route==='not-found'?t('Không tìm thấy','Not found'):labels[locale][route]}]}/>
  <div className="showcase-actions">
   <Button variant="ghost" className="showcase-header-button showcase-language-button" lang={locale==='vi'?'en':'vi'} aria-label={locale==='vi'?'English':'Tiếng Việt'} onClick={()=>setLocale(locale==='vi'?'en':'vi')}><Icon name="globe" className="showcase-header-icon"/><span className="showcase-language-full">{locale==='vi'?'English':'Tiếng Việt'}</span><span className="showcase-language-short" aria-hidden="true">{locale==='vi'?'EN':'VI'}</span></Button>
   <Button variant="ghost" className="showcase-header-button showcase-theme-button" aria-label={themeLabel} onClick={()=>setTheme(dark?'light':'dark')}><Icon name={dark?'sun':'moon'}/><span className="showcase-theme-label">{themeLabel}</span></Button>
  </div>
 </div>;
 const sidebar=<Sidebar label={t('Khám phá Nova','Explore Nova')} triggerLabel={t('Mở menu','Open menu')} mobileValue={menu} onMobileValueChange={setMenu} returnFocusRef={sidebarReturn}>
  <div className="showcase-sidebar">
   <Brand caption="Core UI"/>
   <Navigation current={route} locale={locale} onSelect={()=>setMenu(false)}/>
   <div className="showcase-sidebar-identity"><Avatar name="Nguyễn An" size="sm" decorative/><div><strong>Nguyễn An</strong><span>{t('Không gian cá nhân','Personal workspace')}</span></div></div>
  </div>
 </Sidebar>;
 return <NovaProvider theme={theme} locale={locale}><ToastProvider><ConfirmProvider><AppShell className="showcase" data-testid="nova-showcase" mainId="showcase-content" skipLabel={t('Đến nội dung chính','Skip to content')} header={header} sidebar={sidebar}>
  <div className={route==='data'?'showcase-page showcase-page--wide':'showcase-page'}>
   {route==='not-found'?<div className="showcase-page-head"><div className="showcase-page-head__text"><p className="showcase-eyebrow">404</p><h1>{t('Không tìm thấy trang','Page not found')}</h1><p className="showcase-page-intro">{t('Trang này chưa có trong showcase.','This page is not available.')}</p><p><a className="showcase-link" href="#/forms">{t('Về Biểu mẫu','Back to Forms')}</a></p></div></div>:pages[route]}
   <footer className="showcase-page-footer"><span>{t('Nova · Core UI cho trải nghiệm hằng ngày','Nova · Core UI for everyday experiences')}</span><span>{t('Bản mẫu cục bộ · dữ liệu giả lập','Local preview · simulated data')}</span></footer>
  </div>
 </AppShell></ConfirmProvider></ToastProvider></NovaProvider>;
}
