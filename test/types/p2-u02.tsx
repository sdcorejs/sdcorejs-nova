// case-p2-u02-ac01-types: actual packed/root/subpath resolution is parent-owned.
import {ImportWizard,type ImportColumn,type ImportWizardProps,type WorkbookAdapter,type RowIssue} from '@sdcorejs/nova/import-wizard';
import {ImportWizard as RootWizard} from '@sdcorejs/nova';
type Contact={name:string;count:number;raw:{id:string}|null};
const columns:readonly ImportColumn<Contact>[]=[{key:'name',label:'Name',parse:cell=>String(cell)},{key:'count',label:'Count',parse:cell=>Number(cell)},{key:'raw',label:'Raw',parse:()=>null}];
const adapter:WorkbookAdapter={parse:async(file,ctx)=>{const raw:File=file,signal:AbortSignal=ctx.signal;void [raw,signal];return {sheets:[{name:'Sheet',rows:[['name','count','raw'],['A',0,null]]}]};}};
const props:ImportWizardProps<Contact>={adapter,columns,maxRows:1,maxFileBytes:100,validate:async(rows,ctx)=>{const count:number=rows[0]!.count;void [count,ctx.signal];return [] as readonly RowIssue[];},onCommit:async(rows,ctx)=>{const raw:{id:string}|null=rows[0]!.raw;void [raw,ctx.signal];return {status:'rejected',issues:[{row:2,column:'name',severity:'error',message:'Try again'}]};}};
const valid=<><ImportWizard {...props}/><RootWizard {...props}/></>;
// @ts-expect-error consumer must explicitly bound rows and file bytes
const unbounded=<ImportWizard adapter={adapter} columns={columns} validate={props.validate} onCommit={props.onCommit}/>;
// @ts-expect-error parse must return the selected key's actual type
const wrongParse:ImportColumn<Contact>={key:'count',label:'Count',parse:()=>false};
// @ts-expect-error keys must belong to the typed row
const unknownKey:ImportColumn<Contact>={key:'missing',label:'Missing',parse:()=>null};
// @ts-expect-error adapter receives a raw File, never text
adapter.parse('filename',{signal:new AbortController().signal});
// @ts-expect-error no controlled business value prop exists
const controlled=<ImportWizard {...props} value={[]}/>;
// @ts-expect-error no generic disabled prop is part of the approved API
const disabled=<ImportWizard {...props} disabled/>;
// @ts-expect-error validation cannot silently replace typed rows
const transform:ImportWizardProps<Contact>={...props,validate:async()=>[{name:'A',count:1,raw:null}]};
// @ts-expect-error onCommit has a closed result discriminant
const badCommit:ImportWizardProps<Contact>={...props,onCommit:async()=>({status:'pending'})};
// @ts-expect-error row snapshot is readonly
props.validate([], {signal:new AbortController().signal}).then(issues=>issues.push({row:2,severity:'error',message:'x'}));
void [valid,unbounded,wrongParse,unknownKey,controlled,disabled,transform,badCommit];

// G-COMPOSE: both entrypoints expose only the documented outer div ref.
import {createRef,type RefCallback} from 'react';
const rootRef=createRef<HTMLDivElement>();
const cleanupRef:RefCallback<HTMLDivElement>=node=>{if(node){const root:HTMLDivElement=node;void root;return ()=>{};}};
const legacyRef:RefCallback<HTMLDivElement>=node=>{const root:HTMLDivElement|null=node;void root;};
const withRootRef=<><ImportWizard {...props} ref={rootRef}/><RootWizard {...props} ref={cleanupRef}/><ImportWizard {...props} ref={legacyRef}/></>;
const refProps:ImportWizardProps<Contact>={...props,ref:rootRef};
// @ts-expect-error the root is a div, not a button
const wrongRef=<ImportWizard {...props} ref={createRef<HTMLButtonElement>()}/>;
// @ts-expect-error no public chooser focusRef API is declared
const focusRef=<ImportWizard {...props} focusRef={rootRef}/>;
// @ts-expect-error arbitrary native event props are not part of the surface API
const nativeClick=<ImportWizard {...props} onClick={()=>{}}/>;
void [withRootRef,refProps,wrongRef,focusRef,nativeClick];
