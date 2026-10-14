import { ConfirmProvider, useConfirm } from '@sdcorejs/nova/confirm';
import type { ConfirmOptions, ConfirmResult, ConfirmProviderProps } from '@sdcorejs/nova/confirm';
const props:ConfirmProviderProps={children:null};void props;
function View(){const confirm=useConfirm();const options:ConfirmOptions={title:'Delete?',description:'Details',tone:'danger',signal:new AbortController().signal,confirmLabel:'Delete',cancelLabel:'Stay'};const result:Promise<ConfirmResult>=confirm(options);void result;return <ConfirmProvider>Body</ConfirmProvider>;}
void View;
// @ts-expect-error title is required
const missing:ConfirmOptions={};void missing;
// @ts-expect-error decision is a result union, not implicit boolean approval
const approved:ConfirmResult=true;void approved;
// @ts-expect-error provider does not accept a destructive action callback
<ConfirmProvider onConfirm={()=>{}}>Body</ConfirmProvider>;
// @ts-expect-error content is required
<ConfirmProvider/>;
// @ts-expect-error tone is an explicit closed union
const tone:ConfirmOptions={title:'Title',tone:'warning'};void tone;
// @ts-expect-error cancel signal is the standard AbortSignal
const signal:ConfirmOptions={title:'Title',signal:{aborted:false}};void signal;
// @ts-expect-error consumer labels remain strings
const label:ConfirmOptions={title:'Title',cancelLabel:<span>Stay</span>};void label;
