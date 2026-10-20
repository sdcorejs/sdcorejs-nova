import type {ReactNode} from 'react';
import {Card} from '@sdcorejs/nova/card';
import type {Locale} from './navigation.js';

/** Showcase copy helper: every visible string is written in both languages. */
export type Translate=(vi:string,en:string)=>string;
const translators:Record<Locale,Translate>={vi:vi=>vi,en:(_vi,en)=>en};
/** Stable per locale, so memoized field lists only change when the language does. */
export const translator=(locale:Locale):Translate=>translators[locale];

// Showcase-owned 16px line icons (stroke 1.5). Only <path> elements so the
// navigation test can read the stroke colour of the first path.
const ICONS={
 edit:'M10.5 3.25l2.25 2.25L6 12.25H3.75V10zM9.25 4.5l2.25 2.25',
 actions:'M2.5 8h10M8.75 4.25 12.5 8l-3.75 3.75',
 navigation:'M2.5 4.25h11M2.5 8h11M2.5 11.75h11',
 overlays:'M2.5 3.5h11v9h-11zM9.5 3.5v9',
 dates:'M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3',
 feedback:'M4 11.25V7a4 4 0 0 1 8 0v4.25l1 1H3zM6.5 14h3',
 data:'M2.5 2.5h11v11h-11zM2.5 6.25h11M2.5 9.75h11M6.5 6.25v7.25',
 files:'M2 4.5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z',
 jobs:'M2.75 8a5.25 5.25 0 1 0 1.55-3.7M2.5 2.5v2.75h2.75M8 5v3l2 1.5',
 utilities:'M8 2.5l5.5 3L8 8.5l-5.5-3zM2.5 8.25l5.5 3 5.5-3M2.5 10.75l5.5 3 5.5-3',
 moon:'M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z',
 sun:'M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M3.4 12.6l1.05-1.05M11.55 4.45l1.05-1.05M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
 globe:'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM1.75 8h12.5M8 1.75c1.7 1.75 2.5 3.85 2.5 6.25S9.7 12.5 8 14.25M8 1.75C6.3 3.5 5.5 5.6 5.5 8s.8 4.5 2.5 6.25',
 plus:'M8 3v10M3 8h10',
 filter:'M2.5 3.5h11l-4.25 5v4l-2.5 1.5V8.5z',
 download:'M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10',
 upload:'M8 10.5v-8M4.5 6 8 2.5 11.5 6M3 13.5h10',
 chevron:'M6 3.5 10.5 8 6 12.5',
 check:'M3 8.5l3 3 7-7',
 copy:'M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3',
 eye:'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
 file:'M4 1.5h5l3.5 3.5v9.5H4zM9 1.5V5h3.5',
 info:'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM8 7.25v3.75M8 4.75v.5',
 users:'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.5-2.5 2.2-4 4.5-4s4 1.5 4.5 4M11 2.75a2.5 2.5 0 0 1 0 4.5M12 9.75c1.3.5 2.2 1.8 2.5 3.75',
 refresh:'M13.25 8a5.25 5.25 0 0 1-9.6 2.95M2.75 8a5.25 5.25 0 0 1 9.6-2.95M12.5 2v3.25H9.25M3.5 14v-3.25h3.25',
 history:'M2.75 8a5.25 5.25 0 1 0 1.55-3.7M2.5 2.5v2.75h2.75M8 5v3l2 1.5',
 search:'M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.5 10.5 14 14',
 inbox:'M2 9.5 4 3h8l2 6.5V13H2zM2 9.5h3.5l1 1.5h3l1-1.5H14',
} as const;
export type IconName=keyof typeof ICONS;
export function Icon({name,className}:{name:IconName;className?:string}){
 return <svg className={className?'showcase-icon '+className:'showcase-icon'} viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function PageHead({eyebrow,title,intro,actions}:{eyebrow:string;title:string;intro:string;actions?:ReactNode}){
 return <div className="showcase-page-head">
  <div className="showcase-page-head__text"><p className="showcase-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="showcase-page-intro">{intro}</p></div>
  {actions?<div className="showcase-toolbar">{actions}</div>:null}
 </div>;
}

/** Card = header (title 16/24, optional meta and actions) / body padding 16 / optional footer. */
export function DemoCard({title,meta,lead,actions,footer,children,className,'data-testid':testId}:{title:ReactNode;meta?:ReactNode;lead?:ReactNode;actions?:ReactNode;footer?:ReactNode;children:ReactNode;className?:string;'data-testid'?:string}){
 return <Card className={className?'showcase-card '+className:'showcase-card'} data-testid={testId}>
  <div className="showcase-card__head">
   <div className="showcase-card__heading">{lead}<div className="showcase-card__titles"><h2>{title}</h2>{meta?<p className="showcase-meta">{meta}</p>:null}</div></div>
   {actions?<div className="showcase-toolbar">{actions}</div>:null}
  </div>
  <div className="showcase-card__body">{children}</div>
  {footer?<div className="showcase-card__foot">{footer}</div>:null}
 </Card>;
}

/** Raw values, enums and JSON live only inside this disclosure. */
export function TechDetails({t,topic,children}:{t:Translate;topic?:string;children:ReactNode}){
 return <details className="showcase-tech"><summary><Icon name="chevron" className="showcase-tech__chevron"/>{t('Chi tiết kỹ thuật','Technical details')}{topic?' · '+topic:''}</summary><div className="showcase-tech__body">{children}</div></details>;
}
export function TechRow({label,children}:{label:string;children:ReactNode}){
 return <div className="showcase-tech__row"><span className="showcase-tech__label">{label}</span><span className="showcase-tech__value">{children}</span></div>;
}
/** Two-column label/value row used for read-only facts. */
export function InfoRow({label,children}:{label:ReactNode;children:ReactNode}){
 return <div className="showcase-info-row"><span className="showcase-info-row__label">{label}</span><span className="showcase-info-row__value">{children}</span></div>;
}
