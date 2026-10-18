'use client';
import { useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SurfaceProps } from '../../types/index.js';
import { useNovaScope } from '../../providers/nova/context.js';
import { en } from '../../i18n/en.js';
import { cx } from '../../lib/cx.js';
export type ScrollAreaProps=SurfaceProps&{label?:string;children:ReactNode;maxHeight?:string};
export function ScrollArea({label,children,maxHeight,className,style,'data-testid':testId}:ScrollAreaProps){
  const {strings}=useNovaScope();const [root,setRoot]=useState<HTMLDivElement|null>(null),[content,setContent]=useState<HTMLDivElement|null>(null),[overflow,setOverflow]=useState(false);
  useLayoutEffect(()=>{
    if(!root||!content)return;let disposed=false;const owner=root.ownerDocument.defaultView;
    const measure=()=>{if(disposed)return;setOverflow(root.clientHeight>0&&root.clientWidth>0&&(root.scrollHeight>root.clientHeight||root.scrollWidth>root.clientWidth));};
    const resize=owner?.ResizeObserver?new owner.ResizeObserver(measure):null;resize?.observe(root);resize?.observe(content);
    const changes=owner?.MutationObserver?new owner.MutationObserver(measure):null;changes?.observe(content,{childList:true,subtree:true,characterData:true,attributes:true});changes?.observe(root,{attributes:true,attributeFilter:['style','class']});
    owner?.addEventListener('resize',measure);measure();
    return()=>{disposed=true;resize?.disconnect();changes?.disconnect();owner?.removeEventListener('resize',measure);};
  },[root,content]);
  const name=label?.trim()?label:strings.navigation.scrollArea??en.navigation.scrollArea;
  return <div ref={setRoot} className={cx('nova-scroll-area',className)} style={maxHeight===undefined?style:{...style,maxHeight}} data-testid={testId} role={overflow?'region':undefined} aria-label={overflow?name:undefined} tabIndex={overflow?0:undefined}><div ref={setContent} className="nova-scroll-area__content">{children}</div></div>;
}
