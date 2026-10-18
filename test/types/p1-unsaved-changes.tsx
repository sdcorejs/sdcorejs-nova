import {UnsavedChangesProvider,useUnsavedChanges,useConfirmLeave,type LeavePrompt} from '@sdcorejs/nova/unsaved-changes';
export function Editor(){useUnsavedChanges({id:'profile',scopeKey:'one',revision:1,dirty:true,save:async({signal})=>{signal.throwIfAborted();}});const leave=useConfirmLeave();const result:Promise<'leave'|'stay'>=leave('one');void result;return null;}
<UnsavedChangesProvider renderPrompt={(request:LeavePrompt)=><button onClick={()=>request.choose('stay')}>{request.phase}</button>}><Editor/></UnsavedChangesProvider>;
export function MissingRevisionFixture(){
// @ts-expect-error revision required for async reconciliation
useUnsavedChanges({id:'x',scopeKey:'one',dirty:true});

return null;
}
