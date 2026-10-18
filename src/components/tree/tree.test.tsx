import { StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tree, type TreeProps, type TreeSource } from './index.js';
import { NovaProvider } from '../../providers/nova/index.js';
type Node = { id: string | number; label: string; children?: readonly Node[]; branch?: boolean };
const child: Node = { id: 'child', label: 'Child', branch: true }, root: Node = { id: 0, label: 'Root', branch: true };
const key = (item: Node) => item.id, label = (item: Node) => item.label;
function deferred() { let resolve!: (value: readonly Node[]) => void, reject!: (reason: unknown) => void; const promise = new Promise<readonly Node[]>((yes,no) => { resolve=yes; reject=no; }); return { promise, resolve, reject }; }
function Harness({ source, scopeKey='a', initial=[], ...rest }: { source: TreeSource<Node, Node['id']>; scopeKey?: string; initial?: readonly Node['id'][] } & Partial<Omit<TreeProps<Node, Node['id']>, 'source' | 'scopeKey'>>) {
  const [expanded,setExpanded] = useState(initial), [selected,setSelected] = useState<readonly Node['id'][]>(['missing']);
  return <NovaProvider locale="en"><Tree aria-label="Files" scopeKey={scopeKey} source={source} getKey={key} getLabel={label} expandedKeys={expanded} onExpandedKeysChange={setExpanded} selectedKeys={selected} onSelectedKeysChange={setSelected} {...rest}/><output aria-label="Selection">{JSON.stringify(selected)}</output></NovaProvider>;
}
afterEach(cleanup);
describe('D04 tree contract', () => {
  it('case-p2-d04-ac01-unit loads exactly direct children with raw identity and keeps typed zero keys distinct', async () => {
    const zero: Node = { id:'0', label:'String zero' }, load = vi.fn<(n:Node,ctx:{signal:AbortSignal})=>Promise<readonly Node[]>>(async () => [child,zero]); const action=vi.fn(), slot=vi.fn((n: Node) => n.label);
    render(<Harness source={{mode:'lazy', roots:[root], hasChildren:n=>!!n.branch, loadChildren:load}} renderItem={slot} actions={[{id:'inspect',label:'Inspect',onAction:action}]}/>);
    fireEvent.keyDown(screen.getByRole('treeitem',{name:'Root'}),{key:'ArrowRight'});
    const node=await screen.findByRole('treeitem',{name:'Child'}); expect(load).toHaveBeenCalledTimes(1); expect(load.mock.calls[0]?.[0]).toBe(root); expect(node.getAttribute('aria-level')).toBe('2'); expect(node.getAttribute('aria-posinset')).toBe('1'); expect(node.getAttribute('aria-setsize')).toBe('2');
    expect(screen.getByRole('treeitem',{name:'String zero'})).toBeTruthy(); expect(slot.mock.calls.some(([n])=>n===child)).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Actions for Child'})); fireEvent.click(await screen.findByRole('menuitem',{name:'Inspect'})); await waitFor(()=>expect(action).toHaveBeenCalledWith(child));
    fireEvent.keyDown(node,{key:' '}); expect(screen.getByRole('status',{name:'Selection'}).textContent).toBe('["missing","child"]'); expect(load).toHaveBeenCalledTimes(1);
  });
  it('case-p2-d04-ac02-unit double expansion has one inflight read; collapse aborts and ignores a late result', async () => {
    const first=deferred(), second=deferred(); const signals: AbortSignal[]=[]; const load=vi.fn((_n:Node,ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);return signals.length===1?first.promise:second.promise;});
    render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}}/>);
    const item=screen.getByRole('treeitem',{name:'Root'}); fireEvent.keyDown(item,{key:'ArrowRight'}); fireEvent.keyDown(item,{key:'ArrowRight'}); expect(load).toHaveBeenCalledTimes(1); expect(screen.getByRole('status',{name:''}).textContent).toContain('Loading');
    fireEvent.keyDown(item,{key:'ArrowLeft'}); expect(signals[0]?.aborted).toBe(true); await act(async()=>first.resolve([child])); expect(screen.queryByRole('treeitem',{name:'Child'})).toBeNull();
    fireEvent.keyDown(item,{key:'ArrowRight'}); expect(load).toHaveBeenCalledTimes(2); await act(async()=>second.resolve([child])); expect(await screen.findByRole('treeitem',{name:'Child'})).toBeTruthy(); fireEvent.keyDown(item,{key:'ArrowLeft'}); fireEvent.keyDown(item,{key:'ArrowRight'}); expect(load).toHaveBeenCalledTimes(2);
  });
  it.each(['scope','transport','mode','unmount'] as const)('case-p2-d04-ac02-unit %s invalidation aborts and ignores stale reads', async change => {
    const pending=deferred(), signals:AbortSignal[]=[]; const load=vi.fn((_n:Node,ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);return signals.length===1?pending.promise:new Promise<readonly Node[]>(()=>{});}); const source:TreeSource<Node,Node['id']>={mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load};
    const view=render(<Harness source={source} initial={[0]}/>); await waitFor(()=>expect(load).toHaveBeenCalledTimes(1));
    if(change==='unmount')view.unmount(); else view.rerender(<Harness source={change==='mode'?{mode:'static',roots:[{id:9,label:'Fresh'}],getChildren:()=>[]}:change==='transport'?{...source,loadChildren:async()=>[{id:9,label:'Fresh'}]}:source} scopeKey={change==='scope'?'b':'a'} initial={[0]}/>);
    expect(signals[0]?.aborted).toBe(true); await act(async()=>pending.resolve([{id:'stale',label:'Stale'}])); expect(screen.queryByRole('treeitem',{name:'Stale'})).toBeNull();
  });
  it('case-p2-d04-ac02-unit fresh wrappers, roots and accessors keep the transport; StrictMode cleanup still permits one current result', async () => {
    const pending=deferred(), signals:AbortSignal[]=[]; const load=vi.fn((_n:Node,ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);return pending.promise;});
    const view=render(<StrictMode><Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}}/></StrictMode>); fireEvent.keyDown(screen.getByRole('treeitem',{name:'Root'}),{key:'ArrowRight'});
    view.rerender(<StrictMode><Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}} getKey={n=>n.id} getLabel={n=>n.label}/></StrictMode>); expect(load).toHaveBeenCalledTimes(1); expect(signals[0]?.aborted).toBe(false); await act(async()=>pending.resolve([child])); expect(await screen.findByRole('treeitem',{name:'Child'})).toBeTruthy();
  });
  it('case-p2-d04-ac02-unit collapsing a parent aborts a pending descendant branch', async () => {
    const pending=deferred(), signals:AbortSignal[]=[]; const load=vi.fn((n:Node,ctx:{signal:AbortSignal})=>n===root?Promise.resolve([child]):(signals.push(ctx.signal),pending.promise));
    render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}}/>); const parent=screen.getByRole('treeitem',{name:'Root'}); fireEvent.keyDown(parent,{key:'ArrowRight'}); const descendant=await screen.findByRole('treeitem',{name:'Child'}); fireEvent.keyDown(descendant,{key:'ArrowRight'}); fireEvent.keyDown(parent,{key:'ArrowLeft'}); expect(signals[0]?.aborted).toBe(true); await act(async()=>pending.resolve([{id:'late',label:'Late'}])); fireEvent.keyDown(parent,{key:'ArrowRight'}); expect(screen.queryByRole('treeitem',{name:'Late'})).toBeNull();
  });
  it('case-p2-d04-ac03-unit supports roving parent/child, visible sibling, Home/End keyboard and independent selection', () => {
    const a:Node={id:0,label:'A',children:[{id:'b',label:'B'}]}, c:Node={id:'0',label:'C'};
    render(<Harness source={{mode:'static',roots:[a,c],getChildren:n=>n.children??[]}}/>); const itemA=screen.getByRole('treeitem',{name:'A'}), itemC=screen.getByRole('treeitem',{name:'C'}); itemA.focus(); expect(itemA.tabIndex).toBe(0); expect(itemC.tabIndex).toBe(-1);
    fireEvent.keyDown(itemA,{key:'ArrowRight'}); fireEvent.keyDown(itemA,{key:'ArrowRight'}); const itemB=screen.getByRole('treeitem',{name:'B'}); expect(document.activeElement).toBe(itemB); fireEvent.keyDown(itemB,{key:'ArrowDown'}); expect(document.activeElement).toBe(itemC); fireEvent.keyDown(itemC,{key:'ArrowUp'}); expect(document.activeElement).toBe(itemB); fireEvent.keyDown(itemB,{key:'ArrowLeft'}); expect(document.activeElement).toBe(itemA);
    fireEvent.keyDown(itemA,{key:'End'}); expect(document.activeElement).toBe(itemC); fireEvent.keyDown(itemC,{key:' '}); expect(screen.getByRole('status',{name:'Selection'}).textContent).toBe('["missing","0"]'); expect(itemA.getAttribute('aria-selected')).toBe('false'); fireEvent.keyDown(itemC,{key:'Home'}); expect(document.activeElement).toBe(itemA); fireEvent.keyDown(itemA,{key:'ArrowLeft'}); expect(screen.queryByRole('treeitem',{name:'B'})).toBeNull();
  });
  it('case-p2-d04-ac03-unit branch failures are safe, accessible and retry only on user activation', async () => {
    const load=vi.fn().mockRejectedValueOnce(new Error('secret stack')).mockResolvedValueOnce([child]); render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}}/>); const parent=screen.getByRole('treeitem',{name:'Root'}); fireEvent.keyDown(parent,{key:'ArrowRight'});
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to load'); expect(screen.queryByText('secret stack')).toBeNull(); expect(load).toHaveBeenCalledTimes(1); fireEvent.click(screen.getByRole('button',{name:'Retry Root'})); expect(await screen.findByRole('treeitem',{name:'Child'})).toBeTruthy(); expect(load).toHaveBeenCalledTimes(2);
  });
  it('case-p2-d04-ac03-unit known leaves never fetch and a loaded empty branch becomes a leaf', async () => {
    const load=vi.fn(async()=>[]); render(<Harness source={{mode:'lazy',roots:[root,{id:'leaf',label:'Leaf'}],hasChildren:n=>!!n.branch,loadChildren:load}}/>); const leaf=screen.getByRole('treeitem',{name:'Leaf'}); fireEvent.keyDown(leaf,{key:'ArrowRight'}); expect(load).not.toHaveBeenCalled(); const parent=screen.getByRole('treeitem',{name:'Root'}); fireEvent.keyDown(parent,{key:'ArrowRight'}); await waitFor(()=>expect(parent.hasAttribute('aria-expanded')).toBe(false)); fireEvent.keyDown(parent,{key:'ArrowRight'}); expect(load).toHaveBeenCalledTimes(1);
  });
  it('case-p2-d04-ac03-unit empty roots retain a named empty tree and translated status', () => {
    const {rerender}=render(<Harness source={{mode:'static',roots:[],getChildren:()=>[]}}/>); expect(screen.getByRole('tree',{name:'Files'})).toBeTruthy(); expect(screen.getByRole('status',{name:''}).textContent).toContain('No items'); rerender(<NovaProvider locale="vi"><Tree aria-label="Tệp" scopeKey="a" source={{mode:'static',roots:[],getChildren:()=>[]}} getKey={key} getLabel={label} expandedKeys={[]} onExpandedKeysChange={()=>{}}/></NovaProvider>); expect(screen.getByRole('status',{name:''}).textContent).toBe('Không có mục nào');
  });
  it.each(['cycle','duplicate','nonfinite'] as const)('case-p2-d04-ac03-unit safely rejects %s before rendering ambiguous items and deduplicates static diagnostics', reason => {
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{}); const a:Node={id:0,label:'Private data'}, b:Node={id:reason==='nonfinite'?NaN:0,label:'Other'}; if(reason==='cycle')a.children=[a]; const source:TreeSource<Node,Node['id']>={mode:'static',roots:reason==='cycle'?[a]:[a,b],getChildren:n=>n.children??[]};
    const view=render(<Harness source={source}/>); expect(screen.queryAllByRole('treeitem')).toHaveLength(0); expect(screen.getByRole('alert')).toBeTruthy(); view.rerender(<Harness source={{...source}}/>); expect(warn).toHaveBeenCalledTimes(1); expect(warn.mock.calls.flat().join(' ')).not.toContain('Private data'); warn.mockRestore();
  });
  it('case-p2-d04-ac03-unit explicit maxDepth truncates accessibly and never fetches at its boundary; invalid maxDepth is safe', () => {
    const load=vi.fn(async()=>[child]); const view=render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}} maxDepth={1}/>); fireEvent.keyDown(screen.getByRole('treeitem',{name:'Root'}),{key:'ArrowRight'}); expect(load).not.toHaveBeenCalled(); expect(screen.getByRole('status',{name:''}).textContent).toContain('Maximum tree depth reached'); const warn=vi.spyOn(console,'warn').mockImplementation(()=>{}); view.rerender(<Harness source={{mode:'static',roots:[root],getChildren:()=>[]}} maxDepth={0}/>); expect(screen.getByRole('alert')).toBeTruthy(); warn.mockRestore();
  });
  it('case-p2-d04-ac03-unit controlled expansion emits proposals only; omitted selection callback remains inert', () => {
    const expanded=Object.freeze([] as Node['id'][]), select=Object.freeze([0] as Node['id'][]), proposal=vi.fn(); render(<NovaProvider locale="en"><Tree<Node,Node['id']> aria-label="Files" scopeKey="a" source={{mode:'static',roots:[{...root,children:[child]}],getChildren:n=>n.children??[]}} getKey={key} getLabel={label} expandedKeys={expanded} onExpandedKeysChange={proposal} selectedKeys={select}/></NovaProvider>); const item=screen.getByRole('treeitem',{name:'Root'}); fireEvent.keyDown(item,{key:'ArrowRight'}); expect(proposal).toHaveBeenCalledWith([0]); expect(screen.queryByRole('treeitem',{name:'Child'})).toBeNull(); fireEvent.keyDown(item,{key:' '}); expect(item.getAttribute('aria-selected')).toBe('true'); expect(expanded).toEqual([]); expect(select).toEqual([0]);
  });
  it('case-p2-d04-ac03-unit render slots retain zero and disabled/readOnly suppress changes', () => {
    const proposal=vi.fn(); const view=render(<Harness source={{mode:'static',roots:[root],getChildren:n=>n===root?[child]:[]}} renderItem={()=>0} disabled onExpandedKeysChange={proposal}/>); const item=screen.getByRole('treeitem',{name:'Root'}); expect(item.textContent).toContain('0'); fireEvent.keyDown(item,{key:'ArrowRight'}); fireEvent.keyDown(item,{key:' '}); expect(proposal).not.toHaveBeenCalled(); view.rerender(<Harness source={{mode:'static',roots:[root],getChildren:()=>[]}} readOnly onSelectedKeysChange={proposal}/>); fireEvent.keyDown(screen.getByRole('treeitem',{name:'Root'}),{key:' '}); expect(proposal).not.toHaveBeenCalled();
  });
  it('case-p2-d04-ac02-unit pending results validate against current roots while preserving stable transport', async () => {
    const pending=deferred(),load=vi.fn(()=>pending.promise),warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const view=render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}}/>); fireEvent.keyDown(screen.getByRole('treeitem',{name:'Root'}),{key:'ArrowRight'});
    view.rerender(<Harness source={{mode:'lazy',roots:[root,{id:'collision',label:'New sibling'}],hasChildren:n=>!!n.branch,loadChildren:load}}/>); expect(load).toHaveBeenCalledTimes(1);
    await act(async()=>pending.resolve([{id:'collision',label:'Duplicate child'}])); expect(screen.getByRole('treeitem',{name:'Root'})).toBeTruthy(); expect(screen.getByRole('treeitem',{name:'New sibling'})).toBeTruthy(); expect(screen.getByRole('alert').textContent).toContain('Unable to load'); expect(screen.queryByRole('treeitem',{name:'Duplicate child'})).toBeNull(); warn.mockRestore();
  });
  it('case-p2-d04-ac03-unit external collapse restores a removed child focus without stealing deliberate outside focus', () => {
    const source:TreeSource<Node,Node['id']>={mode:'static',roots:[{...root,children:[child]}],getChildren:n=>n.children??[]};
    const view=render(<Harness source={source} expandedKeys={[0]}/>); const descendant=screen.getByRole('treeitem',{name:'Child'}); act(()=>descendant.focus()); view.rerender(<Harness source={source} expandedKeys={[]}/>); expect(document.activeElement).toBe(screen.getByRole('treeitem',{name:'Root'}));
    view.rerender(<><button>Outside</button><Harness source={source} expandedKeys={[0]}/></>); act(()=>screen.getByRole('button',{name:'Outside'}).focus()); view.rerender(<><button>Outside</button><Harness source={source} expandedKeys={[]}/></>); expect(document.activeElement).toBe(screen.getByRole('button',{name:'Outside'}));
  });
  it('case-p2-d04-ac03-unit RTL mirrors parent and child keys while keeping vertical traversal', () => {
    const source:TreeSource<Node,Node['id']>={mode:'static',roots:[{...root,children:[child]}],getChildren:n=>n.children??[]};
    function Rtl(){const [keys,setKeys]=useState<readonly Node['id'][]>([]);return <NovaProvider locale="en" dir="rtl"><Tree scopeKey="rtl" source={source} getKey={key} getLabel={label} expandedKeys={keys} onExpandedKeysChange={setKeys}/></NovaProvider>;}
    render(<Rtl/>); const parent=screen.getByRole('treeitem',{name:'Root'}); act(()=>parent.focus());fireEvent.keyDown(parent,{key:'ArrowLeft'});fireEvent.keyDown(parent,{key:'ArrowLeft'});const descendant=screen.getByRole('treeitem',{name:'Child'});expect(document.activeElement).toBe(descendant);fireEvent.keyDown(descendant,{key:'ArrowRight'});expect(document.activeElement).toBe(parent);
  });
  it('case-p2-d04-ac02-unit rejected controlled collapse proposals leave the current read intact', async () => {
    const pending=deferred(),signals:AbortSignal[]=[],proposal=vi.fn(),load=vi.fn((_n:Node,ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);return pending.promise;});
    render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}} expandedKeys={[0]} onExpandedKeysChange={proposal}/>);await waitFor(()=>expect(load).toHaveBeenCalledTimes(1));const parent=screen.getByRole('treeitem',{name:'Root'});fireEvent.keyDown(parent,{key:'ArrowLeft'});expect(proposal).toHaveBeenCalledWith([]);expect(parent.getAttribute('aria-expanded')).toBe('true');expect(signals[0]?.aborted).toBe(false);await act(async()=>pending.resolve([child]));expect(await screen.findByRole('treeitem',{name:'Child'})).toBeTruthy();
  });
  it('case-p2-d04-ac03-unit a consumer render-slot action may prevent selection; fetched children do not take focus', async () => {
    const pending=deferred(),load=vi.fn(()=>pending.promise);render(<Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}} renderItem={n=><button onClick={event=>event.preventDefault()}>{n.label} custom</button>}/>);fireEvent.click(screen.getByRole('button',{name:'Root custom'}));expect(screen.getByRole('status',{name:'Selection'}).textContent).toBe('["missing"]');const parent=screen.getByRole('treeitem',{name:'Root'});act(()=>parent.focus());fireEvent.keyDown(parent,{key:'ArrowRight'});await act(async()=>pending.resolve([child]));expect(document.activeElement).toBe(parent);
  });
  it('case-p2-d04-ac02-unit StrictMode initially expanded reads abort the first owner and accept only the current generation', async () => {
    const work:[ReturnType<typeof deferred>,ReturnType<typeof deferred>]=[deferred(),deferred()],signals:AbortSignal[]=[];const load=vi.fn((_n:Node,ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);return work[signals.length-1]!.promise;});render(<StrictMode><Harness source={{mode:'lazy',roots:[root],hasChildren:n=>!!n.branch,loadChildren:load}} initial={[0]}/></StrictMode>);expect(load).toHaveBeenCalledTimes(2);expect(signals[0]?.aborted).toBe(true);expect(signals[1]?.aborted).toBe(false);await act(async()=>work[0].resolve([{id:'stale',label:'Stale'}]));expect(screen.queryByRole('treeitem',{name:'Stale'})).toBeNull();await act(async()=>work[1].resolve([child]));expect(await screen.findByRole('treeitem',{name:'Child'})).toBeTruthy();
  });
});

it.each(['{Enter}', ' '] as const)('case-p2-d04-r1-unit keyboard Retry %s keeps branch focus and respects later outside focus', async activation => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup(), pending = deferred();
  const load = vi.fn().mockRejectedValueOnce(new Error('private error')).mockImplementationOnce(() => pending.promise);
  render(<><button>Outside tree</button><Harness source={{ mode: 'lazy', roots: [root], hasChildren: n => !!n.branch, loadChildren: load }}/></>);
  const parent = screen.getByRole('treeitem', { name: 'Root' });
  act(() => parent.focus());
  fireEvent.keyDown(parent, { key: 'ArrowRight' });
  const retry = await screen.findByRole('button', { name: 'Retry Root' });
  act(() => retry.focus());
  expect(document.activeElement).toBe(retry);
  await user.keyboard(activation);
  expect(load).toHaveBeenCalledTimes(2);
  expect(parent.getAttribute('aria-busy')).toBe('true');
  expect(screen.queryByRole('button', { name: 'Retry Root' })).toBeNull();
  expect(document.activeElement).toBe(parent);
  expect(parent.tabIndex).toBe(0);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(parent);
  const outside = screen.getByRole('button', { name: 'Outside tree' });
  act(() => outside.focus());
  expect(document.activeElement).toBe(outside);
  await act(async () => pending.resolve([child]));
  expect(await screen.findByRole('treeitem', { name: 'Child' })).toBeTruthy();
  expect(document.activeElement).toBe(outside);
  expect(load).toHaveBeenCalledTimes(2);
});
