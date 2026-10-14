import { ToastProvider, useToast } from '@sdcorejs/nova/toast';
import type { ToastInput, ToastProviderProps } from '@sdcorejs/nova/toast';
function View(){const api=useToast();const input:ToastInput={title:'Saved',tone:'success',durationMs:null,announcement:'polite',action:{label:'Undo',onAction:async ctx=>{const signal:AbortSignal=ctx.signal;void signal;}}};const id:string=api.show(input);const updated:boolean=api.update(id,{description:'Details',durationMs:0,announcement:'assertive'});const dismissed:boolean=api.dismiss(id);void updated;void dismissed;return <ToastProvider maxVisible={2} offset="1rem" onActionError={(_error,id)=>'Safe '+id}>Body</ToastProvider>;}
void View;
const props:ToastProviderProps={children:null};void props;
// @ts-expect-error title is required
const missing:ToastInput={description:'Only description'};void missing;
// @ts-expect-error tone remains a closed union
const tone:ToastInput={title:'Title',tone:'critical'};void tone;
// @ts-expect-error raw exception does not become a rendered action error
<ToastProvider onActionError={error=>error}>Body</ToastProvider>;
// @ts-expect-error provider content is required
<ToastProvider/>;
// @ts-expect-error duration is numeric milliseconds or persistent null
const duration:ToastInput={title:'Title',durationMs:'forever'};void duration;
// @ts-expect-error immutable identity is not an update field
function Invalid(){useToast().update('id',{id:'replacement'});}void Invalid;
// @ts-expect-error action has an explicit accessible label
const action:ToastInput={title:'Title',action:{onAction:()=>{}}};void action;
