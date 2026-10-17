import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, TablePagination } from '../../src/components/data-table/index.js';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
const rows = [{ id: 0, title: 'Number zero' }, { id: '0', title: 'String zero' }];
const state = { page: { pageIndex: 0, pageSize: 10 }, sort: [] as const, selectedKeys: [0] };
describe('case-p2-d01-ac01-ssr deterministic request-local table', () => {
  it('renders caption/raw typed rows, closed actions and controlled expansion without browser globals or callbacks', () => {
    expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined'); const change = vi.fn(), action = vi.fn();
    const tree = <NovaProvider locale="en"><DataTable caption="Files" rows={rows} getRowKey={row => row.id} columns={[{ id: 'title', header: 'Title', cell: row => row.title, sortKey: 'title', minWidth: 180 }]} state={state} onStateChange={change} total={2} rowActions={[{ id: 'open', label: 'Open', onAction: action }]} expandedKeys={[0]} onExpandedKeysChange={change} renderExpanded={row => <span>Details {row.title}</span>} renderMobileRow={row => <span>Mobile {row.title}</span>} /></NovaProvider>;
    const html = renderToString(tree); expect(renderToString(tree)).toBe(html); expect(html).toContain('<table'); expect(html).toContain('<caption>Files</caption>'); expect(html).toContain('Number zero'); expect(html).toContain('String zero'); expect(html).toContain('Details'); expect(html).toContain('width="180"'); expect(html).not.toContain('role="grid"'); expect(html).not.toContain('role="menu"'); expect(change).not.toHaveBeenCalled(); expect(action).not.toHaveBeenCalled();
  });
  it('keeps unrelated server renders isolated and unknown totals deterministic', () => {
    const render = (caption: string) => renderToString(<DataTable caption={caption} rows={[]} getRowKey={(row: { id: number }) => row.id} columns={[{ id: 'id', header: 'ID', cell: row => row.id }]} state={state} onStateChange={() => {}} hasNextPage={false} />);
    expect(render('First')).not.toContain('Second'); expect(render('Second')).not.toContain('First');
    const html = renderToString(<NovaProvider locale="en"><TablePagination page={state.page} onPageChange={() => {}} hasNextPage /></NovaProvider>); expect(html).toContain('Next page'); expect(html).not.toContain('of'); expect(renderToString(<TablePagination page={{ pageIndex: -1, pageSize: 10 }} onPageChange={() => {}} />)).toContain('NOVA_TABLE_INVALID_CONFIGURATION');
  });
});
