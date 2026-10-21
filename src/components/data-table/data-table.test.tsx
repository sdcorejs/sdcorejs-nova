import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { act, useEffect, useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { DataTable, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS, TablePagination, type TableState } from './index.js';

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
  const range = () => document.querySelector('.nova-table-pagination__range')?.textContent;
  it('case-p2-d01-q1-unit defaults to 20/50/100 and still lists a current size outside the options', async () => {
    expect(DEFAULT_PAGE_SIZE_OPTIONS).toEqual([20, 50, 100]); expect(DEFAULT_PAGE_SIZE).toBe(20); expect(Object.isFrozen(DEFAULT_PAGE_SIZE_OPTIONS)).toBe(true);
    render(<Pagination total={95} />); const select = screen.getByRole('combobox', { name: 'Rows per page' });
    expect(select.textContent).toBe('10'); await userEvent.click(select);
    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['10', '20', '50', '100']);
  });
  it('case-p2-d01-q1-unit choosing a size proposes page index 0 and the same size proposes nothing', async () => {
    const change = vi.fn(); render(<Pagination total={95} page={{ pageIndex: 3, pageSize: 20 }} onPageChange={change} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' })); await userEvent.click(await screen.findByRole('option', { name: '20' }));
    expect(change).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' })); await userEvent.click(await screen.findByRole('option', { name: '50' }));
    expect(change).toHaveBeenCalledExactlyOnceWith({ pageIndex: 0, pageSize: 50 });
  });
  it('case-p2-d01-q1-unit an empty option list removes the page-size control', () => {
    render(<Pagination total={95} pageSizeOptions={[]} />); expect(screen.queryByRole('combobox')).toBeNull(); expect(screen.queryByText('Rows per page')).toBeNull();
  });
  it('case-p2-d01-q2-unit first and last buttons are opt-in, bounded by the known total and omit last for unknown totals', async () => {
    const change = vi.fn(); const { rerender } = render(<Pagination total={95} />);
    expect(screen.queryByRole('button', { name: 'First page' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Last page' })).toBeNull();
    rerender(<Pagination total={95} showFirstLast page={{ pageIndex: 0, pageSize: 10 }} onPageChange={change} />);
    expect((screen.getByRole('button', { name: 'First page' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Last page' })); expect(change).toHaveBeenLastCalledWith({ pageIndex: 9, pageSize: 10 });
    rerender(<Pagination total={95} showFirstLast page={{ pageIndex: 9, pageSize: 10 }} onPageChange={change} />);
    expect((screen.getByRole('button', { name: 'Last page' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'First page' })); expect(change).toHaveBeenLastCalledWith({ pageIndex: 0, pageSize: 10 });
    rerender(<Pagination total={undefined} hasNextPage showFirstLast page={{ pageIndex: 2, pageSize: 10 }} onPageChange={change} />);
    expect(screen.getByRole('button', { name: 'First page' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Last page' })).toBeNull();
  });
  it('case-p2-d01-q3-unit range text covers known, empty, unknown-full and unknown-unbounded pages', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<Pagination total={1248} page={{ pageIndex: 62, pageSize: 20 }} />); expect(range()).toBe('1,241–1,248 of 1,248');
    rerender(<Pagination total={0} />); expect(range()).toBe('0–0 of 0');
    rerender(<Pagination total={undefined} hasNextPage page={{ pageIndex: 1, pageSize: 10 }} />); expect(range()).toBe('11–20');
    rerender(<Pagination total={undefined} hasNextPage={false} page={{ pageIndex: 1, pageSize: 10 }} />); expect(range()).toBe('Page 2');
  });
  it('case-p2-d01-q3-unit Vietnamese defaults and consumer overrides of the new optional keys', () => {
    const { rerender } = render(<NovaProvider locale="vi"><TablePagination page={{ pageIndex: 0, pageSize: 20 }} onPageChange={() => {}} total={1248} showFirstLast /></NovaProvider>);
    expect(range()).toBe('1–20 trên 1.248'); for (const name of ['Trang đầu', 'Trang trước', 'Trang sau', 'Trang cuối']) expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Số hàng mỗi trang' })).toBeTruthy();
    rerender(<NovaProvider locale="en" strings={{ navigation: { tableRange: 'Rows {start} to {end} ({total})', tablePageSizeLabel: 'Page size', tableFirst: 'Start', tableLast: 'End' } }}><TablePagination page={{ pageIndex: 0, pageSize: 20 }} onPageChange={() => {}} total={30} showFirstLast /></NovaProvider>);
    expect(range()).toBe('Rows 1 to 20 (30)'); expect(screen.getByRole('combobox', { name: 'Page size' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'End' })).toBeTruthy();
  });
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
  const sort = screen.getByRole('button', { name: 'Identifier' }), description = document.getElementById(sort.getAttribute('aria-describedby')!);
  expect(description?.textContent).toBe('Sort priority 2: Descending'); expect(description?.hidden).toBe(true);
  expect(screen.getByRole('columnheader', { name: 'Identifier' })).toBeTruthy(); expect(document.querySelector('[aria-description]')).toBeNull();
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
it('case-p2-d01-design-r2-unit decorative icons replace text glyphs while names and header semantics stay unchanged', () => {
  render(<Table state={{ ...initial, sort: [{ columnId: 'title', direction: 'asc' }] }} rowActions={[{ id: 'inspect', label: 'Inspect', onAction: () => {} }]} renderExpanded={row => <span>{row.title}</span>} expandedKeys={[]} onExpandedKeysChange={() => {}} />);
  const sort = screen.getByRole('button', { name: 'Title' });
  expect(sort.textContent).toBe('Title'); expect(sort.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  const expand = screen.getByRole('button', { name: 'Expand row 1' });
  expect(expand.textContent).toBe(''); expect(expand.getAttribute('aria-expanded')).toBe('false'); expect(expand.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Expand row' })).toBeTruthy(); expect(screen.getByRole('columnheader', { name: 'Row actions' })).toBeTruthy();
  const trigger = screen.getByRole('button', { name: 'Row actions 1' });
  expect(trigger.textContent).toBe(''); expect(trigger.getAttribute('aria-label')).toBe('Row actions 1'); expect(trigger.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  const navigation = screen.getByRole('navigation', { name: 'Table pagination' });
  for (const name of ['Previous page', 'Next page']) { const button = within(navigation).getByRole('button', { name }); expect(button.textContent).toBe(''); expect(button.querySelector('svg[aria-hidden="true"]')).toBeTruthy(); }
  expect(within(navigation).getByRole('combobox', { name: 'Rows per page' }).textContent).toBe('10');
  expect(navigation.querySelector('.nova-table-pagination__range')?.textContent).toBe('21–30 of 50');
});
it('case-p2-d01-q8-unit expansion column follows selection and open details span one full-width row', () => {
  render(<Table rowActions={[{ id: 'inspect', label: 'Inspect', onAction: () => {} }]} renderExpanded={row => <span>Details {row.title}</span>} expandedKeys={[0]} onExpandedKeysChange={() => {}} />);
  const table = screen.getByRole('table', { name: 'Files' }), headers = within(table).getAllByRole('columnheader').map(header => header.textContent);
  expect(headers).toEqual(['', 'Expand row', 'Title', 'Row actions']);
  const firstRow = table.querySelector('tbody tr')!;
  expect(firstRow.children[1]!.querySelector('button')?.getAttribute('aria-label')).toBe('Collapse row 1');
  const collapse = screen.getByRole('button', { name: 'Collapse row 1' }), detail = document.getElementById(collapse.getAttribute('aria-controls')!)!;
  expect(detail.textContent).toBe('Details Number zero');
  const cell = detail.closest('td')!;
  expect(cell.colSpan).toBe(4); expect(cell.closest('tr')).toBe(firstRow.nextElementSibling); expect(cell.closest('tr')!.hasAttribute('aria-selected')).toBe(false);
  expect(within(table).getAllByRole('row')).toHaveLength(1 + rows.length + 1);
});
it('case-p2-d01-q5-unit slots.empty replaces the default empty state only when there are no rows', () => {
  const { rerender } = render(<Table rows={[]} slots={{ empty: <p>No matching files</p> }} />);
  expect(screen.getByText('No matching files')).toBeTruthy(); expect(screen.queryByText('No data')).toBeNull();
  rerender(<Table rows={[]} />); expect(screen.getByText('No data')).toBeTruthy();
  rerender(<Table slots={{ empty: <p>No matching files</p> }} />); expect(screen.queryByText('No matching files')).toBeNull();
  rerender(<Table rows={[]} loading slots={{ empty: <p>No matching files</p> }} />); expect(screen.queryByText('No matching files')).toBeNull();
});
it('case-p2-d01-q6-unit danger actions keep their menu item role and expose the tone for styling', async () => {
  render(<Table rowActions={[{ id: 'inspect', label: 'Inspect', onAction: () => {} }, { id: 'delete', label: 'Delete', tone: 'danger', onAction: () => {} }]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Row actions 1' }));
  expect((await screen.findByRole('menuitem', { name: 'Delete' })).getAttribute('data-tone')).toBe('danger');
  expect(screen.getByRole('menuitem', { name: 'Inspect' }).hasAttribute('data-tone')).toBe(false);
});
it('case-p2-d01-q1-unit DataTable forwards page-size options and first/last; a size change proposes the first page', async () => {
  const change = vi.fn(); render(<Table pageSizeOptions={[10, 25]} showFirstLast onStateChange={change} />);
  const navigation = screen.getByRole('navigation', { name: 'Table pagination' });
  await userEvent.click(within(navigation).getByRole('combobox', { name: 'Rows per page' }));
  expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['10', '25']);
  await userEvent.click(screen.getByRole('option', { name: '25' }));
  expect(change).toHaveBeenCalledExactlyOnceWith({ ...initial, page: { pageIndex: 0, pageSize: 25 } });
  await userEvent.click(within(navigation).getByRole('button', { name: 'Last page' }));
  expect(change).toHaveBeenLastCalledWith({ ...initial, page: { pageIndex: 4, pageSize: 10 } });
});
it('case-p2-d01-q1-unit DataTable uses its loaded row count for an unknown-total last page', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<Table total={undefined} hasNextPage={false} />);
  expect(document.querySelector('.nova-table-pagination__range')?.textContent).toBe('21–23');
});
it('case-p2-d01-q1-unit rejects non-positive page-size options as an invalid configuration', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {}); const { container } = render(<Table pageSizeOptions={[10, 0]} />);
  expect(container.querySelector('[data-nova-config-error="NOVA_TABLE_INVALID_CONFIGURATION"]')).toBeTruthy(); expect(screen.queryByRole('table')).toBeNull();
});
