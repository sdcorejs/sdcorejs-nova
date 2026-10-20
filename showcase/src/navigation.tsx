import {Navigation as NovaNavigation} from '@sdcorejs/nova/app-shell';
import type {ShowcaseRoute} from './routes.js';
import {Icon} from './ui.js';
export type Locale='vi'|'en';
export const labels:Record<Locale,Record<ShowcaseRoute,string>>={vi:{forms:'Biểu mẫu',actions:'Thao tác',navigation:'Điều hướng',overlays:'Cửa sổ',dates:'Ngày và giờ',feedback:'Phản hồi',data:'Dữ liệu',files:'Tệp',jobs:'Tác vụ',utilities:'Tiện ích'},en:{forms:'Forms',actions:'Actions',navigation:'Navigation',overlays:'Overlays',dates:'Dates and times',feedback:'Feedback',data:'Data',files:'Files',jobs:'Jobs',utilities:'Utilities'}};
const icons={forms:'edit',actions:'actions',navigation:'navigation',overlays:'overlays',dates:'dates',feedback:'feedback',data:'data',files:'files',jobs:'jobs',utilities:'utilities'} as const;
export function Brand({caption}:{caption:string}){return <div className="showcase-brand"><span className="showcase-mark" aria-hidden="true">n</span><span className="showcase-brand-text"><strong>Nova</strong><span className="showcase-brand-caption">{caption}</span></span></div>;}
export function Navigation({current,locale,onSelect}:{current:ShowcaseRoute|'not-found';locale:Locale;onSelect?:()=>void}){
 const items=(Object.keys(labels[locale]) as ShowcaseRoute[]).map(id=>({id,label:labels[locale][id],href:'#/'+id,icon:<Icon name={icons[id]}/>}));
 return <NovaNavigation label={locale==='vi'?'Trang showcase':'Showcase pages'} className="showcase-navigation" currentId={current} onNavigate={onSelect} items={items}/>;
}
