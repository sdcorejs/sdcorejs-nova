'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { abortable } from '../../lib/p1-async-lifecycle.js';
import { useNovaScope } from '../../providers/nova/context.js';
import { en } from '../../i18n/en.js';

export function useClipboard():{copy:(text:string)=>Promise<boolean>;pending:boolean;errorMessage?:string}{
  const {strings}=useNovaScope();const owner=useRef<AbortController|null>(null),mounted=useRef(true);
  const [pending,setPending]=useState(false),[failed,setFailed]=useState(false);
  const failureMessage=strings.feedback.copyFailed??en.feedback.copyFailed;
  useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const active=owner.current;owner.current=null;active?.abort();};},[]);
  const copy=useCallback((text:string):Promise<boolean>=>{
    if(!mounted.current||owner.current)return Promise.resolve(false);
    const active=new AbortController();owner.current=active;setPending(true);setFailed(false);
    let work:Promise<void>;
    try{if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');work=Promise.resolve(navigator.clipboard.writeText(text));}
    catch(error){work=Promise.reject(error);}
    const finish=(success:boolean)=>{
      if(active.signal.aborted||!mounted.current)return false;
      if(owner.current===active){owner.current=null;setPending(false);setFailed(!success);}
      return success;
    };
    return abortable(work,active.signal).then(()=>finish(true),()=>finish(false));
  },[]);
  return {copy,pending,errorMessage:failed?failureMessage:undefined};
}
