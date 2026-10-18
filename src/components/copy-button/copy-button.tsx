'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { SurfaceProps } from '../../types/index.js';
import { useClipboard } from '../../hooks/clipboard/clipboard.js';
import { useNovaScope } from '../../providers/nova/context.js';
import { en } from '../../i18n/en.js';
import { cx } from '../../lib/cx.js';
import { Button } from '../button/button.js';
export type CopyButtonProps=SurfaceProps&{text:string;label?:string};
export function CopyButton({text,label,className,style,'data-testid':testId}:CopyButtonProps){
  const {strings}=useNovaScope();const {copy,pending}=useClipboard();
  const [result,setResult]=useState<{text:string;kind:'copied'|'failed'|null}>({text,kind:null});
  if(result.text!==text)setResult({text,kind:null});
  const status=result.text===text?result.kind:null;
  const failed=status==='failed',message=status==='copied'?(strings.feedback.copied??en.feedback.copied):failed?(strings.feedback.copyFailed??en.feedback.copyFailed):'';
  const mounted=useRef(true),currentText=useRef(text),running=useRef(false),generation=useRef({value:0}),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useLayoutEffect(()=>{if(currentText.current!==text){generation.current.value++;if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}}currentText.current=text;});
  useLayoutEffect(()=>{mounted.current=true;const stamp=generation.current;return()=>{mounted.current=false;stamp.value++;if(timer.current!==null)clearTimeout(timer.current);};},[]);
  const name=label?.trim()?label:strings.common.copy??en.common.copy;
  return <span className={cx('nova-copy-button',className)} style={style} data-testid={testId}>
    <Button variant="secondary" loading={pending} onClick={()=>{
      if(running.current)return;running.current=true;const copiedText=text,capturedGeneration=generation.current.value;
      setResult({text,kind:null});if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
      void copy(copiedText).then(success=>{
        running.current=false;if(!mounted.current||generation.current.value!==capturedGeneration||currentText.current!==copiedText)return;
        setResult({text:copiedText,kind:success?'copied':'failed'});
        if(success)timer.current=setTimeout(()=>{timer.current=null;if(mounted.current&&generation.current.value===capturedGeneration)setResult({text,kind:null});},3000);
      });
    }}>{name}</Button>
    <span className={failed?'nova-copy-button__error':'nova-copy-button__status'} role="status" aria-live="polite">{message}</span>
    {failed&&<code className="nova-copy-button__fallback">{text}</code>}
  </span>;
}
