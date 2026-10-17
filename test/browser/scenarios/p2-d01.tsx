import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useEffect, useRef, useState } from 'react';
import { DataTable, type TableState } from '../../../src/components/data-table/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';
type Row = { id: number | string; title: string; disabled?: boolean };
const rows: readonly Row[] = [{ id: 0, title: 'Number zero' }, { id: '0', title: 'String zero' }, { id: 2, title: 'Disabled row', disabled: true }];
function LatestRows() {
  const [query, setQuery] = useState('old'), [data, setData] = useState<readonly Row[]>([]), generation = useRef(0), resolvers = useRef(new Map<string, (value: readonly Row[]) => void>());
  useEffect(() => {
    const token = ++generation.current; let active = true;
    const promise = new Promise<readonly Row[]>(resolve => { resolvers.current.set(query, resolve); });
    void promise.then(next => { if (active && token === generation.current) setData(next); });
    return () => { active = false; };
  }, [query]);
  return <section aria-label="Consumer orchestration"><button onClick={() => setQuery('new')}>New filter</button><button onClick={() => resolvers.current.get('new')?.([{ id: 1, title: 'Latest result' }])}>Resolve new</button><button onClick={() => resolvers.current.get('old')?.([{ id: 2, title: 'Stale result' }])}>Resolve old</button><DataTable caption="Filtered files" rows={data} getRowKey={row => row.id} columns={[{ id: 'title', header: 'Result', cell: row => row.title }]} state={{ page: { pageIndex: 0, pageSize: 10 }, sort: [], selectedKeys: [] }} onStateChange={() => {}} hasNextPage={false} /></section>;
}
export default function TableScenario() {
  const [state, setState] = useState<TableState<Row['id']>>({ page: { pageIndex: 0, pageSize: 10 }, sort: [], selectedKeys: ['missing'] }), [expanded, setExpanded] = useState<readonly Row['id'][]>([]), [action, setAction] = useState(''), [mobile, setMobile] = useState(true), [refreshing, setRefreshing] = useState(false);
  return <NovaProvider locale="en"><button onClick={() => setMobile(value => !value)}>Toggle mobile renderer</button><button onClick={() => setRefreshing(value => !value)}>Toggle refresh</button><button onClick={() => setExpanded([])}>Collapse rows externally</button><DataTable caption="Files" rows={rows} getRowKey={row => row.id} columns={[{ id: 'title', header: 'Title', sortKey: 'title', cell: row => <span>{row.title}</span>, minWidth: 280 }]} state={state} onStateChange={setState} hasNextPage={state.page.pageIndex === 0} isRowSelectable={row => !row.disabled} rowActions={[{ id: 'inspect', label: 'Inspect', onAction: row => { setAction(`${typeof row.id}:${row.id}`); } }]} expandedKeys={expanded} onExpandedKeysChange={setExpanded} renderExpanded={row => <><span>Detail {row.title}</span><button onClick={() => setAction('detail interaction')}>Keep detail {row.title}</button><button onClick={() => setExpanded([])}>Close detail {row.title}</button></>} renderMobileRow={mobile ? row => <span>Mobile {row.title}</span> : undefined} loading={refreshing} /><output aria-label="Selection">{JSON.stringify(state.selectedKeys)}</output><output aria-label="Sort">{JSON.stringify(state.sort)}</output><output aria-label="Page">{state.page.pageIndex}</output><output aria-label="Action">{action}</output><LatestRows /></NovaProvider>;
}



// This scenario starts from actual server-rendered markup, then hydrates the
// same controlled tree. Every interactive browser case also exercises hydration.
export function mount(container: HTMLElement) {
  function HydratedTableScenario() {
    useEffect(() => { if (container.dataset.hydration !== 'failed') container.dataset.hydration = 'complete'; }, []);
    return <TableScenario />;
  }
  container.dataset.hydration = 'pending';
  container.innerHTML = renderToString(<HydratedTableScenario />);
  hydrateRoot(container, <HydratedTableScenario />, { onRecoverableError: () => { container.dataset.hydration = 'failed'; } });
}
