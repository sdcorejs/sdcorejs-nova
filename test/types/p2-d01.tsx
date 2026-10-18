// case-p2-d01-ac01-types: packed public contracts, including negative business types.
import { DataTable, TablePagination, type Column, type TableState } from '@sdcorejs/nova/data-table';
import { DataTable as RootTable } from '@sdcorejs/nova';
import type { MenuAction } from '@sdcorejs/nova/types';
type Row = { id: number | string; title: string; count: number };
const rows: readonly Row[] = [{ id: 0, title: 'File', count: 0 }];
const state: TableState<Row['id']> = { page: { pageIndex: 0, pageSize: 10 }, sort: [], selectedKeys: [0, '0'] };
const columns: readonly Column<Row>[] = [{ id: 'title', header: 'Title', cell: row => row.title, sortKey: 'title', minWidth: 160 }];
const actions: readonly MenuAction<Row>[] = [{ id: 'open', label: 'Open', onAction: row => { const count: number = row.count; void count; } }];
const props = { rows, columns, getRowKey: (row: Row) => row.id, caption: 'Files', state, onStateChange: (next: TableState<Row['id']>) => { const keys: readonly (number | string)[] = next.selectedKeys; void keys; } };
const table = <DataTable {...props} rowActions={actions} renderMobileRow={row => row.title} renderExpanded={row => row.count} expandedKeys={[0]} onExpandedKeysChange={keys => { const key: number | string | undefined = keys[0]; void key; }} slots={{ group: raw => raw[0]?.title }} hasNextPage />;
const root = <RootTable {...props} />;
const pagination = <TablePagination page={state.page} total={0} onPageChange={page => { const index: number = page.pageIndex; void index; }} />;
// @ts-expect-error state and proposal callback are mandatory; table has no uncontrolled business store
<DataTable rows={rows} columns={columns} getRowKey={row => row.id} caption="Files" />;
// @ts-expect-error caption is the native table accessible name
<DataTable rows={rows} columns={columns} getRowKey={row => row.id} state={state} onStateChange={() => {}} />;
// @ts-expect-error a boolean is not a stable row key
<DataTable {...props} getRowKey={() => false} />;
// @ts-expect-error mobile slots receive raw Row rather than a display string
<DataTable {...props} renderMobileRow={(row: string) => row} />;
// @ts-expect-error action callbacks keep the row's business type
<DataTable {...props} rowActions={[{ id: 'bad', label: 'Bad', onAction: (row: string) => { void row; } }]} />;
// @ts-expect-error selected keys share the row key domain
const badState: TableState<number> = { page: state.page, sort: [], selectedKeys: ['0'] };
// @ts-expect-error sort direction is finite
const badSort: TableState<number> = { page: state.page, sort: [{ columnId: 'title', direction: 'up' }], selectedKeys: [] };
// @ts-expect-error row cells preserve raw types
const badColumn: Column<Row> = { id: 'bad', header: 'Bad', cell: (row: number) => row };
// @ts-expect-error pagination has no defaultPage uncontrolled API
<TablePagination defaultPage={state.page} onPageChange={() => {}} />;
// @ts-expect-error pagination needs a proposal handler
<TablePagination page={state.page} />;
void [table, root, pagination, badState, badSort, badColumn];
