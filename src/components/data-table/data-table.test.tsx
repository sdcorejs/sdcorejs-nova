import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { act, useEffect, useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { DataTable, TablePagination, type TableState } from './index.js';

type Row = { id: number | string; title: string; disabled?: boolean };
const rows: readonly Row[] = [{ id: 0, title: 'Number zero' }, { id: '0', title: 'String zero' }, { id: 2, title: 'Disabled row', disabled: true }];
const columns = [{ id: 'title', header: 'Title', sortKey: 'title', cell: (row: Row) => row.title }];
const initial: TableState<Row['id']> = { page: { pageIndex: 2, pageSize: 10 }, sort: [], selectedKeys: ['missing'] };
const getRowKey = (row: Row) => row.id;
function Table(props: Partial<React.ComponentProps<typeof DataTable<Row, Row['id']>>> = {}) {
  return <NovaProvider locale="en"><DataTable rows={rows} columns={columns} getRowKey={getRowKey} caption="Files" state={initial} onStateChange={() => {}} total={50} {...props} /></NovaProvider>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('D01 controlled native table', () => {
  it('case-p2-d01-ac02-unit AC-005/008 renders native caption and raw cells without sorting or mutation', async () => {
    const cell = vi.fn((row: Row) => row.title), change = vi.fn();
    render(<Table columns={[{ ...columns[0]!, cell }]} onStateChange={change} />);
    const table = screen.getByRole('table', { name: 'Files' });
    expect(table.tagName).toBe('TABLE');
    expect(within(table).getAllByRole('cell').map(node => node.textContent)).toContain('Number zero');
    expect(cell.mock.calls.some(([row]) => row === rows[0])).toBe(true);
    const sort = within(table).getByRole('button', { name: 'Title' });
    sort.focus(); await userEvent.keyboard('{Enter}');
    expect(change).toHaveBeenCalledExactlyOnceWith({ ...initial, sort: [{ columnId: 'title', direction: 'asc' }] });
    expect(within(table).getByRole('columnheader', { name: 'Title' }).getAttribute('aria-sort')).toBe('none');
  });
  it('AC-008 cycles sort atomically and keeps consumer page without reordering rows', async () => {
    function Owned() { const [state, set] = useState(initial); return <Table state={state} onStateChange={set} />; }
    render(<Owned />); const sort = screen.getByRole('button', { name: 'Title' });
    await userEvent.click(sort); expect(sort.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
    await userEvent.click(sort); expect(sort.closest('th')!.getAttribute('aria-sort')).toBe('descending');
    await userEvent.click(sort); expect(sort.closest('th')!.getAttribute('aria-sort')).toBe('none');
    expect(screen.getByText('Number zero').compareDocumentPosition(screen.getByText('String zero')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('case-p2-d01-ac03-unit AC-006 page selection skips disabled rows, retains absent keys and distinguishes typed zeros', async () => {
    const change = vi.fn(); const { rerender } = render(<Table isRowSelectable={row => !row.disabled} onStateChange={change} />);
    const page = screen.getByRole('checkbox', { name: 'Select current page' });
    page.focus(); await userEvent.keyboard(' ');
    expect(change).toHaveBeenCalledExactlyOnceWith({ ...initial, selectedKeys: ['missing', 0, '0'] });
    expect(screen.getByRole('checkbox', { name: 'Select row 3' }).getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 3' })); expect(change).toHaveBeenCalledTimes(1);
    rerender(<Table state={{ ...initial, selectedKeys: ['missing', 0] }} isRowSelectable={row => !row.disabled} onStateChange={change} />);
    expect(screen.getByRole('checkbox', { name: 'Select current page' }).getAttribute('aria-checked')).toBe('mixed');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    expect(change).toHaveBeenLastCalledWith({ ...initial, selectedKeys: ['missing', 0, '0'] });
    rerender(<Table state={{ ...initial, selectedKeys: ['missing', 0, '0', 2] }} isRowSelectable={row => !row.disabled} onStateChange={change} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select current page' }));
    expect(change).toHaveBeenLastCalledWith({ ...initial, selectedKeys: ['missing', 2] });
  });
  it('AC-005 gives exact raw objects to actions/mobile/expanded/group and handles controlled expansion', async () => {
    const action = vi.fn(), mobile = vi.fn((row: Row) => <span>Mobile {row.title}</span>), expanded = vi.fn((row: Row) => <button>Details {row.title}</button>), group = vi.fn(() => <span>Group</span>), expand = vi.fn();
    render(<Table rowActions={[{ id: 'inspect', label: 'Inspect', onAction: action }]} renderMobileRow={mobile} renderExpanded={expanded} expandedKeys={[0]} onExpandedKeysChange={expand} slots={{ group }} />);
    expect(mobile.mock.calls.some(([row]) => row === rows[0])).toBe(true); expect(expanded).toHaveBeenCalledWith(rows[0]); expect(group).toHaveBeenCalledWith(rows);
    await userEvent.click(screen.getAllByRole('button', { name: 'Row actions 1' })[0]!); await userEvent.click(await screen.findByRole('menuitem', { name: 'Inspect' })); expect(action).toHaveBeenCalledExactlyOnceWith(rows[0]);
    const collapse = screen.getAllByRole('button', { name: 'Collapse row 1' })[0]!;
    collapse.focus(); await userEvent.keyboard('{Enter}'); expect(expand).toHaveBeenLastCalledWith([]); expect(document.activeElement).toBe(collapse);
  });
  it('case-p2-d01-ac05-unit AC-008 returns focus from externally collapsed detail to its own expansion trigger', async () => {
    const expand = vi.fn(); const common = { renderExpanded: (row: Row) => <button>Details {row.title}</button>, onExpandedKeysChange: expand };
    const { rerender } = render(<Table {...common} expandedKeys={[0]} />); screen.getByRole('button', { name: 'Details Number zero' }).focus();
    rerender(<Table {...common} expandedKeys={[]} />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand row 1' })));
  });
  it('AC-005 rejects duplicate/nonfinite keys without exposing row data or emitting state', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {}), change = vi.fn();
    const { container, rerender } = render(<Table rows={[rows[0]!, { id: 0, title: 'Private secret' }]} onStateChange={change} />);
    expect(container.querySelector('[data-nova-config-error="NOVA_TABLE_DUPLICATE_KEY"]')).toBeTruthy(); expect(screen.queryByRole('table')).toBeNull();
    expect(warning.mock.calls.flat().join(' ')).not.toContain('Private secret');
    rerender(<Table rows={[{ id: Infinity, title: 'Hidden' }]} onStateChange={change} />);
    expect(container.querySelector('[data-nova-config-error="NOVA_TABLE_NONFINITE_KEY"]')).toBeTruthy(); expect(change).not.toHaveBeenCalled();
  });
  it('rejects invalid page/total/minWidth and incomplete expansion never creates local state', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {}); const { container, rerender } = render(<Table state={{ ...initial, page: { pageIndex: -1, pageSize: 10 } }} />);
    expect(container.querySelector('[data-nova-config-error="NOVA_TABLE_INVALID_CONFIGURATION"]')).toBeTruthy();
    rerender(<Table columns={[{ ...columns[0]!, minWidth: Infinity }]} />); expect(screen.queryByRole('table')).toBeNull();
    rerender(<Table renderExpanded={() => 'Detail'} expandedKeys={[0]} />); expect(screen.queryByRole('button', { name: /Expand|Collapse/ })).toBeNull(); expect(screen.queryByText('Detail')).toBeNull();
  });
  it('keeps loaded rows and focus during refresh/error, exposes retry and all consumer slots', async () => {
    const retry = vi.fn(); render(<Table loading errorMessage="Try again safely" onRetry={retry} slots={{ title: 'Title slot', filter: <input aria-label="Consumer filter" />, quickSearchRight: 'Right slot', commandHeader: 'Command slot', footer: 'Footer slot' }} />);
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true'); expect(screen.getByText('Number zero')).toBeTruthy(); expect(screen.getByRole('alert').textContent).toContain('Try again safely');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(retry).toHaveBeenCalledExactlyOnceWith();
    for (const text of ['Title slot', 'Right slot', 'Command slot', 'Footer slot']) expect(screen.getByText(text)).toBeTruthy();
  });
  it('initial loading and empty rows retain a semantic table and named scroll region', () => {
    const { rerender } = render(<Table rows={[]} loading />); expect(screen.getByRole('table', { name: 'Files' })).toBeTruthy(); expect(screen.getByRole('region', { name: 'Files' })).toBeTruthy(); expect(screen.getByRole('status').textContent).toMatch(/Loading/);
    rerender(<Table rows={[]} />); expect(screen.getByText('No data')).toBeTruthy();
  });
  it('case-p2-d01-ac01-unit AC-004 consumer latest-wins filtering ignores a slow previous result and performs no table fetch', async () => {
    const resolvers = new Map<string, (value: readonly Row[]) => void>(); const load = vi.fn((query: string) => new Promise<readonly Row[]>(resolve => { resolvers.set(query, resolve); }));
    function Consumer() { const [query, setQuery] = useState('old'), [data, setData] = useState<readonly Row[]>([]), generation = useRef(0); useEffect(() => { const token = ++generation.current; let active = true; void load(query).then(next => { if (active && token === generation.current) setData(next); }); return () => { active = false; }; }, [query]); return <><button onClick={() => setQuery('new')}>New filter</button><Table rows={data} /></>; }
    const { unmount } = render(<Consumer />); await userEvent.click(screen.getByRole('button', { name: 'New filter' }));
    await act(async () => { resolvers.get('new')!([{ id: 1, title: 'Latest row' }]); }); expect(screen.getByText('Latest row')).toBeTruthy();
    await act(async () => { resolvers.get('old')!([{ id: 2, title: 'Stale row' }]); }); expect(screen.queryByText('Stale row')).toBeNull(); expect(load).toHaveBeenCalledTimes(2); unmount();
  });
});
describe('D01 pagination', () => {
  function Pagination(props: Partial<React.ComponentProps<typeof TablePagination>> = {}) { return <NovaProvider locale="en"><TablePagination page={{ pageIndex: 0, pageSize: 10 }} onPageChange={() => {}} total={0} {...props} /></NovaProvider>; }
  it('AC-007 disables both directions at total zero and only proposes controlled pages', async () => {
    const change = vi.fn(); const { rerender } = render(<Pagination onPageChange={change} />); expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true); expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<Pagination total={21} onPageChange={change} />); await userEvent.click(screen.getByRole('button', { name: 'Next page' })); expect(change).toHaveBeenCalledExactlyOnceWith({ pageIndex: 1, pageSize: 10 });
  });
  it('case-p2-d01-ac04-unit AC-007 unknown total requires explicit hasNextPage, never invents a last page', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {}); const change = vi.fn(); const { rerender } = render(<Pagination total={undefined} onPageChange={change} />);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<Pagination total={undefined} hasNextPage onPageChange={change} />); await userEvent.click(screen.getByRole('button', { name: 'Next page' })); expect(change).toHaveBeenCalledExactlyOnceWith({ pageIndex: 1, pageSize: 10 }); expect(screen.queryByText(/of/)).toBeNull();
  });
  it.each([{ pageIndex: -1, pageSize: 10 }, { pageIndex: 0, pageSize: 0 }, { pageIndex: 0.5, pageSize: 1 }, { pageIndex: 0, pageSize: NaN }])('AC-007 rejects invalid page %j', page => { vi.spyOn(console, 'warn').mockImplementation(() => {}); const { container } = render(<Pagination page={page} />); expect(container.querySelector('[data-nova-config-error="NOVA_TABLE_INVALID_CONFIGURATION"]')).toBeTruthy(); expect(screen.queryByRole('navigation')).toBeNull(); });
  it.each([-1, Infinity, 0.5])('AC-007 rejects invalid total %s', total => { vi.spyOn(console, 'warn').mockImplementation(() => {}); render(<Pagination total={total} />); expect(screen.queryByRole('navigation')).toBeNull(); });
  it('disables next at an exact known boundary and previous proposes the preceding page', async () => { const change = vi.fn(); render(<Pagination total={20} page={{ pageIndex: 1, pageSize: 10 }} onPageChange={change} />); expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true); await userEvent.click(screen.getByRole('button', { name: 'Previous page' })); expect(change).toHaveBeenCalledExactlyOnceWith({ pageIndex: 0, pageSize: 10 }); });
});


it('case-p2-d01-ac05-unit mobile renderer keeps keyboard sort and eligible page selection available', async () => {
  const change = vi.fn(); render(<Table renderMobileRow={row => row.title} onStateChange={change} isRowSelectable={row => !row.disabled} />);
  const list = screen.getByRole('group', { name: 'Files' });
  const sort = within(list).getByRole('button', { name: 'Title' }); sort.focus(); await userEvent.keyboard('{Enter}');
  expect(change).toHaveBeenLastCalledWith({ ...initial, sort: [{ columnId: 'title', direction: 'asc' }] });
  const selection = within(list).getByRole('checkbox', { name: 'Select current page' }); selection.focus(); await userEvent.keyboard(' ');
  expect(change).toHaveBeenLastCalledWith({ ...initial, selectedKeys: ['missing', 0, '0'] });
});
it('case-p2-d01-ac05-unit initial loading includes decorative skeleton rows without fabricating data', () => {
  render(<Table rows={[]} loading />); const table = screen.getByRole('table', { name: 'Files' });
  expect(table.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBeGreaterThan(0);
  expect(within(table).queryAllByRole('cell')).toHaveLength(0); expect(screen.getByRole('status').textContent).toMatch(/Loading/);
});
it('case-p2-d01-ac05-unit multi-sort exposes only the primary header via aria-sort', () => {
  render(<Table columns={[columns[0]!, { id: 'id', header: 'Identifier', sortKey: 'id', cell: row => row.id }]} state={{ ...initial, sort: [{ columnId: 'title', direction: 'asc' }, { columnId: 'id', direction: 'desc' }] }} />);
  const headers = screen.getAllByRole('columnheader');
  expect(headers.filter(header => ['ascending', 'descending'].includes(header.getAttribute('aria-sort') ?? ''))).toHaveLength(1);
  expect(screen.getByRole('columnheader', { name: /Identifier/ }).getAttribute('aria-description')).toContain('2');
});



it('case-p2-d01-ac02-unit retains zero-valued consumer toolbar slots', () => {
  render(<Table slots={{ filter: 0, quickSearchRight: 0 }} />);
  expect(screen.getByText('00')).toBeTruthy();
});


it('case-p2-d01-ac05-unit pointer detail collapse restores focus when the browser leaves focus on body', async () => {
  const props = { renderExpanded: () => <button>Pointer detail</button>, onExpandedKeysChange: () => {} };
  const { rerender } = render(<Table {...props} expandedKeys={[0]} />);
  const detail = screen.getByRole('button', { name: 'Pointer detail' });
  expect(document.activeElement).toBe(document.body); fireEvent.pointerDown(detail);
  rerender(<Table {...props} expandedKeys={[]} />);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand row 1' })));
});
it('case-p2-d01-ac05-unit external collapse never steals focus from another control', () => {
  const props = { renderExpanded: () => <button>Detail</button>, onExpandedKeysChange: () => {} };
  const { rerender } = render(<Table {...props} expandedKeys={[0]} />);
  const sort = screen.getByRole('button', { name: 'Title' }); sort.focus();
  rerender(<Table {...props} expandedKeys={[]} />); expect(document.activeElement).toBe(sort);
});

it('case-p2-d01-ac05-unit pointer collapse returns focus from a browser-focused scroll ancestor', () => {
  const props = { renderExpanded: () => <button>Pointer detail</button>, onExpandedKeysChange: () => {} };
  const { rerender } = render(<Table {...props} expandedKeys={[0]} />);
  screen.getByRole('region', { name: 'Files' }).focus(); fireEvent.pointerDown(screen.getByRole('button', { name: 'Pointer detail' }));
  rerender(<Table {...props} expandedKeys={[]} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand row 1' }));
});
it('case-p2-d01-ac05-unit changing a sort direction retains consumer sort priority and page', async () => {
  const change = vi.fn(), state: TableState<Row['id']> = { ...initial, sort: [{ columnId: 'title', direction: 'asc' }, { columnId: 'id', direction: 'desc' }] };
  render(<Table state={state} onStateChange={change} columns={[columns[0]!, { id: 'id', header: 'ID', sortKey: 'id', cell: row => row.id }]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Title' }));
  expect(change).toHaveBeenCalledExactlyOnceWith({ ...state, sort: [{ columnId: 'title', direction: 'desc' }, { columnId: 'id', direction: 'desc' }] });
});

it('case-p2-d01-r1-unit keyboard navigation revokes stale detail pointer focus ownership', () => {
  const props = { renderExpanded: () => <button>Keep detail open</button>, onExpandedKeysChange: () => {} };
  const { rerender } = render(<Table {...props} expandedKeys={[0]} />);
  const detail = screen.getByRole('button', { name: 'Keep detail open' });
  fireEvent.pointerDown(detail);
  detail.focus();
  fireEvent.keyDown(detail, { key: 'Tab', shiftKey: true });
  const scroll = screen.getByRole('region', { name: 'Files' });
  scroll.focus();
  rerender(<Table {...props} expandedKeys={[]} />);
  expect(document.activeElement).toBe(scroll);
});
