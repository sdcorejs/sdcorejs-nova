import {useAsyncAction,ActionInProgressError} from '@sdcorejs/nova/async-action';
import {BusyBoundary} from '@sdcorejs/nova/busy-boundary';
export function Action(){const action=useAsyncAction(async(ctx,value:number)=>{ctx.signal.throwIfAborted();return String(value);});const result:Promise<string>=action.run(0);void result;void new ActionInProgressError();
// @ts-expect-error argument tuple must remain numeric
action.run('0');return <BusyBoundary busy={action.pending} label="Saving" mode="block"><button onClick={action.cancel}>Cancel</button></BusyBoundary>;}
// @ts-expect-error busy region has an explicit accessible label
<BusyBoundary busy>Missing label</BusyBoundary>;
