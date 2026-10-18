import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ImportWizard,type ImportColumn,type WorkbookAdapter,type ImportWizardProps,type RowIssue} from './index.js';
import {NovaProvider} from '../../providers/nova/index.js';
import type {LoadContext} from '../../types/index.js';
import {createRef,type RefCallback} from 'react';
afterEach(cleanup);
type Row={value:unknown;other:unknown};
const columns:readonly ImportColumn<Row>[]=[{key:'value',label:'Value',parse:cell=>cell},{key:'other',label:'Other',parse:cell=>cell}];
const workbook=(rows:readonly (readonly unknown[])[]=[['value','other'],['a',0]])=>({sheets:[{name:'Contacts',rows}]});
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(v:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function setup(options:Partial<ImportWizardProps<Row>>={}){const adapter:WorkbookAdapter={parse:vi.fn(async()=>workbook())};const validate=vi.fn(async(rows:readonly Row[],ctx:LoadContext)=>{void [rows,ctx];return [] as readonly RowIssue[];}),onCommit=vi.fn(async(rows:readonly Row[],ctx:LoadContext)=>{void [rows,ctx];return {status:'success' as const};});const props={adapter,columns,validate,onCommit,maxRows:4,maxFileBytes:4,...options};const view=render(<NovaProvider locale="en"><ImportWizard {...props}/></NovaProvider>);return {props,view,adapter,validate,onCommit};}
function upload(name='rows.xlsx',size=1){const file=new File(['x'.repeat(size)],name);fireEvent.change(screen.getByLabelText('Choose files',{exact:true}),{target:{files:[file]}});return file;}
async function mapping(){await waitFor(()=>expect(screen.getByText('Workbook ready.')).toBeTruthy());await userEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByLabelText('Source column for Value')).toBeTruthy();}
async function review(){await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByRole('region',{name:'Import review'});}
async function confirm(){await review();await userEvent.click(screen.getByRole('button',{name:'Next'}));}
describe('U02 core orchestration (fake adapters do not certify workbook engines)',()=>{
 it('case-p2-u02-ac01-unit bounds file bytes before parse, accepts exact boundary and preserves focused picker',async()=>{const t=setup();const chooser=screen.getByRole('button',{name:'Choose files or drop them here'});chooser.focus();upload('large.xlsx',5);expect(t.adapter.parse).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('size');const exact=upload('exact.xlsx',4);await waitFor(()=>expect(t.adapter.parse).toHaveBeenCalledTimes(1));expect(t.adapter.parse).toHaveBeenCalledWith(exact,{signal:expect.any(AbortSignal)});await screen.findByText('Workbook ready.');expect(document.activeElement).toBe(chooser);expect(screen.queryByLabelText('Source column for Value')).toBeNull();});
 it.each([NaN,Infinity,-1,0,1.5])('rejects invalid bounded row configuration %s',limit=>{const t=setup({maxRows:limit});expect(screen.getByRole('alert').textContent).toContain('configure');expect(screen.queryByLabelText('Choose files',{exact:true})).toBeNull();expect(t.adapter.parse).not.toHaveBeenCalled();});
 it.each([NaN,Infinity,-1,1.5])('rejects invalid byte configuration %s',limit=>{setup({maxFileBytes:limit});expect(screen.getByRole('alert').textContent).toContain('configure');});
 it.each([{rows:[['','other'],['a',0]]},{rows:[['value','value'],['a',0]]},{rows:[['value'],['a']]}])('missing or duplicate headers prevent review %#',async ({rows})=>{setup({adapter:{parse:async()=>workbook(rows)}});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.queryByRole('region',{name:'Import review'})).toBeNull();expect(screen.getByRole('alert').textContent).toMatch(/header|source column/i);expect(document.activeElement).toBe(screen.getByRole('alert'));});
 it('enforces exact maxRows without dropping empty rows; adapter denial is safe',async()=>{const t=setup({maxRows:2,adapter:{parse:async()=>workbook([['value','other'],['',null],[0,false]])}});upload();await review();expect(t.validate.mock.calls[0]![0]).toEqual([{value:'',other:null},{value:0,other:false}]);cleanup();setup({maxRows:1,adapter:{parse:async()=>workbook([['value','other'],['',null],[0,false]])}});upload();await screen.findByText('Workbook ready.');await userEvent.click(screen.getByRole('button',{name:'Next'}));await userEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.getByRole('alert').textContent).toContain('row limit');cleanup();setup({adapter:{parse:async()=>{throw Error('private compressed bomb stack');}}});upload();await screen.findByRole('link',{name:/Unable to read this workbook/});expect(document.body.textContent).not.toContain('private');});
 it('case-p2-u02-ac02-unit preserves raw cells and typed identity through validation and commit',async()=>{const object={id:'domain'},parse=vi.fn((cell:unknown)=>cell);const t=setup({columns:[{key:'value',label:'Value',parse},{key:'other',label:'Other',parse:cell=>cell}],adapter:{parse:async()=>workbook([['value','other'],['',0],[false,null],[object,'x']])}});upload();await confirm();await userEvent.click(screen.getByRole('button',{name:'Import'}));await screen.findByText('Import complete.');const rows=t.validate.mock.calls[0]![0];expect(rows).toEqual([{value:'',other:0},{value:false,other:null},{value:object,other:'x'}]);expect(rows[2]!.value).toBe(object);expect(t.onCommit.mock.calls[0]![0]).toBe(rows);expect(Object.isFrozen(rows)).toBe(true);expect(rows.every(Object.isFrozen)).toBe(true);});
 it('parse errors identify source row/cell; user Next focuses summary and links focus cell',async()=>{setup({columns:[{key:'value',label:'Value',parse:()=>{throw Error('private invalid number');}},{key:'other',label:'Other',parse:cell=>cell}]});upload();await review();expect(screen.getByRole('alert').textContent).toContain('2');expect(document.activeElement).toBe(screen.getByRole('alert'));await userEvent.click(screen.getByRole('link',{name:/2.*Value/}));expect(document.activeElement?.id).toMatch(/cell-2-value$/);await userEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.queryByRole('button',{name:'Import'})).toBeNull();expect(document.body.textContent).not.toContain('private');});
 it('warnings require explicit confirmation and errors block commit',async()=>{const t=setup({validate:async()=>[{row:2,column:'value',severity:'warning',message:'Confirm duplicate'}]});upload();await confirm();expect((screen.getByRole('button',{name:'Import'}) as HTMLButtonElement).disabled).toBe(true);await userEvent.click(screen.getByLabelText('I confirm the warnings.'));await userEvent.click(screen.getByRole('button',{name:'Import'}));await waitFor(()=>expect(t.onCommit).toHaveBeenCalledTimes(1));cleanup();const blocked=setup({validate:async()=>[{row:2,column:'value',severity:'error',message:'Invalid date'}]});upload();await review();await userEvent.click(screen.getByRole('button',{name:'Next'}));expect(screen.queryByRole('button',{name:'Import'})).toBeNull();expect(blocked.onCommit).not.toHaveBeenCalled();});
 it('case-p2-u02-ac03-unit ignores old file parse and aborts it',async()=>{const old=deferred<ReturnType<typeof workbook>>(),signals:AbortSignal[]=[];const t=setup({adapter:{parse:vi.fn((file,ctx)=>{signals.push(ctx.signal);return file.name==='old.xlsx'?old.promise:Promise.resolve(workbook([['value','other'],['new',0]]));})}});upload('old.xlsx');upload('new.xlsx');await screen.findByText('Workbook ready.');expect(signals[0]!.aborted).toBe(true);await act(async()=>old.resolve(workbook([['wrong','header'],['stale',0]])));await review();expect(t.validate.mock.calls[0]![0][0]!.value).toBe('new');});
 it('mapping edits cancel pending validation, ignore late results and invalidate warning acknowledgement',async()=>{const job=deferred<readonly RowIssue[]>(),signals:AbortSignal[]=[];let call=0;const t=setup({validate:vi.fn((_rows,ctx)=>{signals.push(ctx.signal);return ++call===1?job.promise:Promise.resolve([{row:2,severity:'warning' as const,message:'check'}]);})});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));await waitFor(()=>expect(signals).toHaveLength(1));await userEvent.selectOptions(screen.getByLabelText('Source column for Value'),'1');expect(signals[0]!.aborted).toBe(true);await act(async()=>job.resolve([{row:2,severity:'error',message:'stale error'}]));expect(screen.queryByText('stale error')).toBeNull();await userEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByRole('region',{name:'Import review'});await userEvent.click(screen.getByRole('button',{name:'Next'}));await userEvent.click(screen.getByLabelText('I confirm the warnings.'));await userEvent.click(screen.getByRole('button',{name:'Back'}));await userEvent.click(screen.getByRole('button',{name:'Back'}));await userEvent.selectOptions(screen.getByLabelText('Source column for Value'),'0');await userEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByRole('region',{name:'Import review'});await userEvent.click(screen.getByRole('button',{name:'Next'}));expect((screen.getByRole('button',{name:'Import'}) as HTMLButtonElement).disabled).toBe(true);expect(t.onCommit).not.toHaveBeenCalled();});
 it('singleflight commit and rejected source issues keep the draft',async()=>{const job=deferred<{status:'rejected';issues:readonly RowIssue[]}>();const t=setup({onCommit:vi.fn(()=>job.promise)});upload();await confirm();const button=screen.getByRole('button',{name:'Import'});fireEvent.click(button);fireEvent.click(button);expect(t.props.onCommit).toHaveBeenCalledTimes(1);await act(async()=>job.resolve({status:'rejected',issues:[{row:2,column:'other',severity:'error',message:'Server rejected cell'}]}));expect(screen.getByRole('alert').textContent).toContain('Server rejected cell');expect(screen.getByRole('region',{name:'Import review'})).toBeTruthy();expect(screen.getByRole('cell',{name:'0'})).toBeTruthy();expect(screen.queryByText('Import complete.')).toBeNull();});
 it('sheet selection changes invalidate pending validation and preserve source indexes',async()=>{const pending=deferred<readonly RowIssue[]>(),signals:AbortSignal[]=[];const t=setup({adapter:{parse:async()=>({sheets:[{name:'First',rows:[['value','other'],['a',1]]},{name:'Second',rows:[['value','other'],['b',2]]}]})},validate:vi.fn((_rows,ctx)=>{signals.push(ctx.signal);return signals.length===1?pending.promise:Promise.resolve([]);})});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));await userEvent.selectOptions(screen.getByLabelText('Worksheet'),'1');expect(signals[0]!.aborted).toBe(true);await act(async()=>pending.resolve([{row:2,severity:'error',message:'old sheet'}]));expect(screen.queryByText('old sheet')).toBeNull();await userEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByRole('region',{name:'Import review'});expect(t.props.validate).toHaveBeenLastCalledWith([{value:'b',other:2}],{signal:expect.any(AbortSignal)});});
 it('columns revision prevents committing an obsolete validated snapshot',async()=>{const t=setup();upload();await confirm();const revised:readonly ImportColumn<Row>[]=[{key:'value',label:'Revised',parse:cell=>cell},{key:'other',label:'Other',parse:cell=>cell}];t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} columns={revised}/></NovaProvider>);await waitFor(()=>expect(screen.queryByRole('button',{name:'Import'})).toBeNull());expect(screen.getByLabelText('Source column for Revised')).toBeTruthy();expect(t.onCommit).not.toHaveBeenCalled();});
 it('cancel and unmount abort reads; commit cancel is local and ignores completion',async()=>{const job=deferred<ReturnType<typeof workbook>>();let signal!:AbortSignal;const t=setup({adapter:{parse:(_f,ctx)=>{signal=ctx.signal;return job.promise;}}});upload();await userEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(signal.aborted).toBe(true);await act(async()=>job.resolve(workbook()));expect(screen.queryByText('Workbook ready.')).toBeNull();upload();t.view.unmount();expect(signal.aborted).toBe(true);cleanup();const mutation=deferred<{status:'success'}>();let commitSignal!:AbortSignal;setup({onCommit:(_rows,ctx)=>{commitSignal=ctx.signal;return mutation.promise;}});upload();await confirm();await userEvent.click(screen.getByRole('button',{name:'Import'}));await userEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(commitSignal.aborted).toBe(true);await act(async()=>mutation.resolve({status:'success'}));expect(screen.queryByText('Import complete.')).toBeNull();expect(screen.getByText('Import stopped locally; the server may still finish.')).toBeTruthy();});
 it('cancelled parse and validation responses are ignored before inspecting their payloads',async()=>{const pending=deferred<ReturnType<typeof workbook>>(),read=vi.fn(()=>workbook().sheets);setup({adapter:{parse:()=>pending.promise}});upload();await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await act(async()=>pending.resolve({get sheets(){return read();}}));expect(read).not.toHaveBeenCalled();cleanup();const validation=deferred<readonly RowIssue[]>(),readIssue=vi.fn(()=>2);setup({validate:()=>validation.promise});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await act(async()=>validation.resolve([{get row(){return readIssue();},severity:'error',message:'old'}]));expect(readIssue).not.toHaveBeenCalled();});
 it('summary links focus the file chooser and remount mapping for rejected header issues',async()=>{setup({adapter:{parse:async()=>{throw Error('private');}}});upload();await userEvent.click(await screen.findByRole('link',{name:/Unable to read this workbook/}));expect(document.activeElement).toBe(screen.getByRole('button',{name:'Choose files or drop them here'}));cleanup();setup({onCommit:async()=>({status:'rejected',issues:[{row:1,column:'value',severity:'error',message:'Fix source mapping'}]})});upload();await confirm();await userEvent.click(screen.getByRole('button',{name:'Import'}));await userEvent.click(await screen.findByRole('link',{name:/Fix source mapping/}));expect(document.activeElement).toBe(screen.getByLabelText('Source column for Value'));});
 it('commit transport failure supports one explicit retry without revalidation',async()=>{let attempts=0;const t=setup({onCommit:vi.fn(async()=>{if(++attempts===1)throw Error('private');return {status:'success' as const};})});upload();await confirm();await userEvent.click(screen.getByRole('button',{name:'Import'}));await screen.findByRole('link',{name:/Unable to import these rows/});await userEvent.click(screen.getByRole('button',{name:'Import'}));await screen.findByText('Import complete.');expect(t.props.onCommit).toHaveBeenCalledTimes(2);expect(t.validate).toHaveBeenCalledTimes(1);});
 it('zero bytes are accepted when explicitly bounded to zero',async()=>{const t=setup({maxFileBytes:0});upload('empty.xlsx',0);await screen.findByText('Workbook ready.');expect(t.adapter.parse).toHaveBeenCalledTimes(1);upload('not-empty.xlsx',1);expect(t.adapter.parse).toHaveBeenCalledTimes(1);});
 it('unmount aborts validation and ignores late callbacks',async()=>{const pending=deferred<readonly RowIssue[]>();let signal!:AbortSignal;const t=setup({validate:(_rows,ctx)=>{signal=ctx.signal;return pending.promise;}});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));t.view.unmount();expect(signal.aborted).toBe(true);await act(async()=>pending.resolve([{row:2,severity:'error',message:'late'}]));expect(screen.queryByText('late')).toBeNull();});
 it('validation and commit errors show safe text with an explicit retry path',async()=>{setup({validate:async()=>{throw Error('private validation secret');}});upload();await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByRole('link',{name:/Unable to validate these rows/});expect(document.body.textContent).not.toContain('secret');cleanup();setup({onCommit:async()=>{throw Error('private commit secret');}});upload();await confirm();await userEvent.click(screen.getByRole('button',{name:'Import'}));await screen.findByRole('link',{name:/Unable to import these rows/});expect(screen.getByRole('button',{name:'Import'})).toBeTruthy();expect(document.body.textContent).not.toContain('secret');});
});

describe('U02 R2 public root ref contract',()=>{
 it('object ref targets the actual stable outer root across ordinary and valid-invalid rerenders, and clears on unmount',()=>{
  const ref=createRef<HTMLDivElement>(),t=setup({ref,'data-testid':'ref-root'});
  const root=screen.getByTestId('ref-root');
  expect(ref.current).toBe(root);
  expect(root.classList.contains('nova-import-wizard')).toBe(true);
  expect(root.contains(screen.getByRole('button',{name:'Choose files or drop them here'}))).toBe(true);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} className="ordinary"/></NovaProvider>);
  expect(ref.current).toBe(root);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} maxRows={0}/></NovaProvider>);
  expect(ref.current).toBe(root);
  expect(root.getAttribute('data-nova-config-error')).toBe('NOVA_IMPORT_INVALID_CONFIGURATION');
  expect(root.contains(screen.getByRole('alert'))).toBe(true);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props}/></NovaProvider>);
  expect(ref.current).toBe(root);
  expect(root.hasAttribute('data-nova-config-error')).toBe(false);
  t.view.unmount();
  expect(ref.current).toBeNull();
 });
 it('React19 cleanup callback attaches once through ordinary rerenders and cleans once without a null callback',()=>{
  const dispose=vi.fn(),ref=vi.fn<RefCallback<HTMLDivElement>>(()=>dispose),t=setup({ref,'data-testid':'cleanup-root'});
  const root=screen.getByTestId('cleanup-root');
  expect(ref).toHaveBeenCalledExactlyOnceWith(root);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} className="updated"/></NovaProvider>);
  expect(ref).toHaveBeenCalledTimes(1);
  expect(dispose).not.toHaveBeenCalled();
  t.view.unmount();
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(ref).toHaveBeenCalledTimes(1);
 });
 it('replacement callback and object refs detach their own nodes while retaining the outer DOM identity',()=>{
  const dispose=vi.fn(),first=vi.fn<RefCallback<HTMLDivElement>>(()=>dispose),legacy=vi.fn<RefCallback<HTMLDivElement>>(()=>{}),object=createRef<HTMLDivElement>();
  const t=setup({ref:first,'data-testid':'replacement-root'}),root=screen.getByTestId('replacement-root');
  expect(first).toHaveBeenCalledExactlyOnceWith(root);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={legacy}/></NovaProvider>);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledTimes(1);
  expect(legacy).toHaveBeenCalledExactlyOnceWith(root);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={object}/></NovaProvider>);
  expect(legacy.mock.calls.map(([node])=>node)).toEqual([root,null]);
  expect(object.current).toBe(root);
  t.view.unmount();
  expect(object.current).toBeNull();
  expect(dispose).toHaveBeenCalledTimes(1);
 });
 it('legacy null callback also detaches on unmount from an initially invalid configuration root',()=>{
  const ref=vi.fn<RefCallback<HTMLDivElement>>(()=>{}),t=setup({ref,maxRows:0,'data-testid':'invalid-root'});
  const root=screen.getByTestId('invalid-root');
  expect(ref).toHaveBeenCalledExactlyOnceWith(root);
  expect(root.contains(screen.getByRole('alert'))).toBe(true);
  t.view.unmount();
  expect(ref.mock.calls.map(([node])=>node)).toEqual([root,null]);
 });
 it('ref replacement through pending parse, validation and commit preserves signals, raw typed snapshot and focus',async()=>{
  const parseJob=deferred<ReturnType<typeof workbook>>(),validateJob=deferred<readonly RowIssue[]>(),commitJob=deferred<{status:'success'}>();
  const signals:AbortSignal[]=[],raw={id:'raw-cell'},ref=createRef<HTMLDivElement>();
  const adapter:WorkbookAdapter={parse:vi.fn((_file,ctx)=>{signals.push(ctx.signal);return parseJob.promise;})};
  const validate=vi.fn((_rows:readonly Row[],ctx:LoadContext)=>{signals.push(ctx.signal);return validateJob.promise;});
  const onCommit=vi.fn((_rows:readonly Row[],ctx:LoadContext)=>{signals.push(ctx.signal);return commitJob.promise;});
  const t=setup({ref,adapter,validate,onCommit,'data-testid':'transport-root'}),root=screen.getByTestId('transport-root');
  const chooser=screen.getByRole('button',{name:'Choose files or drop them here'});
  chooser.focus();upload();
  const parseRef=createRef<HTMLDivElement>();
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={parseRef}/></NovaProvider>);
  expect(ref.current).toBeNull();expect(parseRef.current).toBe(root);
  expect(signals[0]!.aborted).toBe(false);expect(document.activeElement).toBe(chooser);
  await act(async()=>parseJob.resolve(workbook([['value','other'],[raw,false]])));
  expect(document.activeElement).toBe(chooser);
  await mapping();await userEvent.click(screen.getByRole('button',{name:'Next'}));
  const validated=validate.mock.calls[0]![0],validationFocus=document.activeElement,validateRef=createRef<HTMLDivElement>();
  expect(validated[0]!.value).toBe(raw);expect(validated[0]!.other).toBe(false);
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={validateRef}/></NovaProvider>);
  expect(parseRef.current).toBeNull();expect(validateRef.current).toBe(root);
  expect(signals[1]!.aborted).toBe(false);expect(document.activeElement).toBe(validationFocus);
  await act(async()=>validateJob.resolve([]));await screen.findByRole('region',{name:'Import review'});
  await userEvent.click(screen.getByRole('button',{name:'Next'}));await userEvent.click(screen.getByRole('button',{name:'Import'}));
  const commitFocus=document.activeElement,commitRef=createRef<HTMLDivElement>();
  t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={commitRef}/></NovaProvider>);
  expect(validateRef.current).toBeNull();expect(commitRef.current).toBe(root);
  expect(signals[2]!.aborted).toBe(false);expect(document.activeElement).toBe(commitFocus);
  expect(adapter.parse).toHaveBeenCalledTimes(1);expect(validate).toHaveBeenCalledTimes(1);expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit.mock.calls[0]![0]).toBe(validated);expect(onCommit.mock.calls[0]![0][0]).toBe(validated[0]);
  await act(async()=>commitJob.resolve({status:'success'}));await screen.findByText('Import complete.');
  expect(commitRef.current).toBe(root);expect(signals.every(signal=>!signal.aborted)).toBe(true);
  t.view.unmount();expect(commitRef.current).toBeNull();
 });
 it('public root ref remains independent of chooser focus and the error summary after ref changes',async()=>{
  const first=createRef<HTMLDivElement>(),t=setup({ref:first,adapter:{parse:async()=>{throw Error('private');}},'data-testid':'focus-root'});
  const root=screen.getByTestId('focus-root'),chooser=screen.getByRole('button',{name:'Choose files or drop them here'});
  chooser.focus();upload();await screen.findByRole('link',{name:/Unable to read this workbook/});
  expect(document.activeElement).toBe(chooser);expect(first.current).toBe(root);
  const next=createRef<HTMLDivElement>();t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={next}/></NovaProvider>);
  expect(next.current).toBe(root);expect(document.activeElement).toBe(chooser);
  await userEvent.click(screen.getByRole('link',{name:/Unable to read this workbook/}));
  expect(document.activeElement).toBe(chooser);expect(document.activeElement).not.toBe(root);
 });
 it('public root ref does not replace the user-triggered summary or concrete cell focus target',async()=>{
  const ref=createRef<HTMLDivElement>(),t=setup({ref,columns:[{key:'value',label:'Value',parse:()=>{throw Error('bad cell');}},{key:'other',label:'Other',parse:cell=>cell}],'data-testid':'summary-root'});
  const root=screen.getByTestId('summary-root');upload();await review();
  const summary=screen.getByRole('alert');expect(document.activeElement).toBe(summary);expect(ref.current).toBe(root);expect(summary).not.toBe(root);
  const next=createRef<HTMLDivElement>();t.view.rerender(<NovaProvider locale="en"><ImportWizard {...t.props} ref={next}/></NovaProvider>);
  expect(next.current).toBe(root);expect(document.activeElement).toBe(summary);
  await userEvent.click(screen.getByRole('link',{name:/2.*Value/}));
  expect(document.activeElement?.id).toMatch(/cell-2-value$/);expect(next.current).toBe(root);
 });
});


describe('U02 selected Stage B R1 repair regressions',()=>{
 it('R1 valid source domain key renders source indexes and cells; rejected source issue focuses its cell and commit receives original typed snapshot',async()=>{
  type SourceRow={source:string};
  const sourceColumns:readonly ImportColumn<SourceRow>[]=[{key:'source',label:'Source value',parse:cell=>String(cell)}];
  const validate=vi.fn(async(rows:readonly SourceRow[],ctx:LoadContext)=>{void [rows,ctx];return [] as readonly RowIssue[];});
  const onCommit=vi.fn(async(rows:readonly SourceRow[],ctx:LoadContext)=>{void [rows,ctx];return {status:'rejected' as const,issues:[{row:2,column:'source',severity:'error' as const,message:'Correct source value'}]};});
  render(<NovaProvider locale="en"><ImportWizard adapter={{parse:async()=>({sheets:[{name:'Source data',rows:[['source'],['caller value']]}]})}} columns={sourceColumns} validate={validate} onCommit={onCommit} maxRows={1} maxFileBytes={4}/></NovaProvider>);
  upload();
  await screen.findByText('Workbook ready.');
  await userEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByLabelText('Source column for Source value')).toBeTruthy();
  await userEvent.click(screen.getByRole('button',{name:'Next'}));
  await screen.findByRole('region',{name:'Import review'});
  expect(screen.getByRole('columnheader',{name:'Source row'})).toBeTruthy();
  expect(screen.getByRole('columnheader',{name:'Source value'})).toBeTruthy();
  expect(screen.getByRole('cell',{name:'2'})).toBeTruthy();
  expect(screen.getByRole('cell',{name:'caller value'})).toBeTruthy();
  const validated=validate.mock.calls[0]![0];
  expect(validated).toEqual([{source:'caller value'}]);
  await userEvent.click(screen.getByRole('button',{name:'Next'}));
  await userEvent.click(screen.getByRole('button',{name:'Import'}));
  await userEvent.click(await screen.findByRole('link',{name:/Row 2, Source value: Correct source value/}));
  expect(document.activeElement).toBe(screen.getByRole('cell',{name:'caller value'}).firstElementChild);
  expect(document.activeElement?.id).toMatch(/cell-2-source$/);
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit.mock.calls[0]![0]).toBe(validated);
  expect(onCommit.mock.calls[0]![0][0]).toBe(validated[0]);
  expect(screen.queryByText('Import complete.')).toBeNull();
 });
 it('R2 sparse outer workbook rows fail safely before validation or commit instead of skipping source row 2',async()=>{
  const rows:(readonly unknown[])[]=[['value','other']];
  rows.length=3;
  rows[2]=['x',0];
  expect(Object.hasOwn(rows,1)).toBe(false);
  const t=setup({adapter:{parse:async()=>workbook(rows)}});
  upload();
  await screen.findByRole('link',{name:/Unable to read this workbook/});
  expect(screen.queryByText('Workbook ready.')).toBeNull();
  expect(screen.queryByRole('region',{name:'Import review'})).toBeNull();
  expect((screen.getByRole('button',{name:'Next'}) as HTMLButtonElement).disabled).toBe(true);
  expect(t.validate).not.toHaveBeenCalled();
  expect(t.onCommit).not.toHaveBeenCalled();
 });
 it('R2 supplemental control: explicit empty row arrays preserve all source indexes and raw cells through commit',async()=>{
  const object={id:'caller-owned'};
  const t=setup({adapter:{parse:async()=>workbook([['value','other'],[],['',0],[false,null],[object,'x']])}});
  upload();
  await review();
  for(const index of ['2','3','4','5'])expect(screen.getByRole('cell',{name:index})).toBeTruthy();
  const validated=t.validate.mock.calls[0]![0];
  expect(validated).toEqual([{value:undefined,other:undefined},{value:'',other:0},{value:false,other:null},{value:object,other:'x'}]);
  expect(validated).toHaveLength(4);
  expect(validated[3]!.value).toBe(object);
  await userEvent.click(screen.getByRole('button',{name:'Next'}));
  await userEvent.click(screen.getByRole('button',{name:'Import'}));
  await screen.findByText('Import complete.');
  expect(t.onCommit.mock.calls[0]![0]).toBe(validated);
 });
});
