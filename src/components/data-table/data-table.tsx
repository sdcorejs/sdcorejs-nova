'use client';
import { Fragment, useEffect, useId, useLayoutEffect, useRef, type ReactNode, type Ref, type RefObject } from 'react';
import { cx } from '../../lib/cx.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { Key, MenuAction, SurfaceProps } from '../../types/index.js';
import { ActionMenu } from '../action-menu/action-menu.js';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { DataState } from '../data-state/data-state.js';
import { Spinner } from '../data-state/spinner.js';
import { Skeleton } from '../data-state/skeleton.js';
import { reportTableDiagnostic, rowKeys, selectPage, tableMessage, tableStrings, toggleKey, validPage, type TableDiagnostic, type TableState } from './data-table-model.js';
import { TablePagination } from './table-pagination.js';

export type Column<T> = { id: string; header: ReactNode; cell: (row: T) => ReactNode; sortKey?: string; minWidth?: number };
export type DataTableProps<T, K extends Key> = SurfaceProps & {
  rows: readonly T[]; getRowKey: (row: T) => K; columns: readonly Column<T>[];
  state: TableState<K>; onStateChange: (state: TableState<K>) => void;
  total?: number; hasNextPage?: boolean; isRowSelectable?: (row: T) => boolean;
  expandedKeys?: readonly K[]; onExpandedKeysChange?: (keys: readonly K[]) => void;
  slots?: { title?: ReactNode; footer?: ReactNode; quickSearchRight?: ReactNode; group?: (rows: readonly T[]) => ReactNode; filter?: ReactNode; commandHeader?: ReactNode };
  loading?: boolean; errorMessage?: string; onRetry?: () => void;
  rowActions?: readonly MenuAction<T>[]; renderMobileRow?: (row: T) => ReactNode; renderExpanded?: (row: T) => ReactNode;
  caption: string; ref?: Ref<HTMLDivElement>;
};
/** Focus stays on the disclosure unless the consumer has moved it into details. */
function Details({ children, restoreFocus, id }: { children: ReactNode; restoreFocus: RefObject<boolean>; id: string }) {
  const node = useRef<HTMLDivElement>(null), pointerActivated = useRef(false);
  useLayoutEffect(() => {
    const detail = node.current;
    if (!detail) return;
    const owner = detail.ownerDocument;
    const focusScope = detail.closest('[role="region"]');
    // The Safari ancestor fallback belongs to the latest detail interaction.
    // A later keyboard action or pointer action elsewhere revokes that ownership.
    const revokePointer = () => { pointerActivated.current = false; };
    const pointerOutside = (event: Event) => { if (!event.composedPath().includes(detail)) revokePointer(); };
    owner.addEventListener('keydown', revokePointer, true);
    owner.addEventListener('pointerdown', pointerOutside, true);
    return () => {
      owner.removeEventListener('keydown', revokePointer, true);
      owner.removeEventListener('pointerdown', pointerOutside, true);
      const active = owner.activeElement;
      if (detail.contains(active) || (pointerActivated.current && (active === owner.body || active === focusScope))) restoreFocus.current = true;
    };
  }, [restoreFocus]);
  return <div id={id} ref={node} className="nova-data-table__details" onPointerDownCapture={() => { pointerActivated.current = true; }}>{children}</div>;
}
function Disclosure({ open, label, onToggle, children }: { open: boolean; label: string; onToggle: () => void; children: ReactNode }) {
  const trigger = useRef<HTMLButtonElement>(null), restoreFocus = useRef(false), id = useId();
  useLayoutEffect(() => {
    // React restores an ancestor's pre-commit focus before layout effects run.
    // Recover after that restoration, only for the disclosure that lost details.
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      if (trigger.current?.isConnected) trigger.current.focus();
    }
  }, [open]);
  return <><Button ref={trigger} variant="ghost" aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle}><span aria-hidden="true">{open ? '−' : '+'}</span></Button>{open ? <Details restoreFocus={restoreFocus} id={id}>{children}</Details> : null}</>;
}
/** Native table over already loaded rows; every business state change is a proposal. */
export function DataTable<T, K extends Key>({ rows, getRowKey, columns, state, onStateChange, total, hasNextPage, isRowSelectable, expandedKeys, onExpandedKeysChange, slots, loading = false, errorMessage, onRetry, rowActions, renderMobileRow, renderExpanded, caption, className, style, 'data-testid': testId, ref }: DataTableProps<T, K>) {
  const scope = useNovaScope(), strings = tableStrings(scope), map = rowKeys(rows, getRowKey);
  const expansion = expandedKeys !== undefined && onExpandedKeysChange !== undefined && renderExpanded !== undefined;
  const partialExpansion = expandedKeys !== undefined || onExpandedKeysChange !== undefined || renderExpanded !== undefined;
  let error: TableDiagnostic | undefined = map.error;
  if (state.selectedKeys.some(key => typeof key === 'number' && !Number.isFinite(key)) || expandedKeys?.some(key => typeof key === 'number' && !Number.isFinite(key))) error = 'NOVA_TABLE_NONFINITE_KEY';
  if (!validPage(state.page, total) || !caption.trim() || !columns.length || new Set(columns.map(column => column.id)).size !== columns.length || columns.some(column => !column.id || (column.minWidth !== undefined && (!Number.isFinite(column.minWidth) || column.minWidth < 0)))) error = 'NOVA_TABLE_INVALID_CONFIGURATION';
  useEffect(() => {
    if (error) reportTableDiagnostic(scope.diagnostics, error, 'DataTable');
    if (partialExpansion && !expansion) reportTableDiagnostic(scope.diagnostics, 'NOVA_TABLE_INCOMPLETE_EXPANSION', 'DataTable');
  }, [error, partialExpansion, expansion, scope.diagnostics]);
  if (error) return <span data-nova-config-error={error}>{scope.strings.forms.configurationError}</span>;
  const eligible = map.keys.filter((_key, index) => isRowSelectable?.(rows[index]!) !== false);
  const count = eligible.filter(key => state.selectedKeys.includes(key)).length;
  const selected: boolean | 'mixed' = count === 0 ? false : count === eligible.length ? true : 'mixed';
  const select = (key: K) => onStateChange({ ...state, selectedKeys: toggleKey(state.selectedKeys, key) });
  const sort = (id: string) => {
    const current = state.sort.find(item => item.columnId === id);
    if (current?.direction === 'desc') {
      onStateChange({ ...state, sort: state.sort.filter(item => item.columnId !== id) });
    } else if (current) {
      onStateChange({ ...state, sort: state.sort.map(item => item.columnId === id ? { columnId: id, direction: 'desc' } : item) });
    } else {
      onStateChange({ ...state, sort: [...state.sort, { columnId: id, direction: 'asc' }] });
    }
  };
  const pageSelection = () => <Checkbox aria-label={strings.selection} value={selected} disabled={!eligible.length} onValueChange={() => onStateChange({ ...state, selectedKeys: selectPage(state.selectedKeys, eligible, selected === true) })} />;
  const sortDescription = (id: string) => {
    const priority = state.sort.findIndex(item => item.columnId === id), current = state.sort[priority];
    return current ? tableMessage(tableMessage(strings.sortPriority, 'priority', priority + 1), 'direction', current.direction === 'asc' ? strings.sortAscending : strings.sortDescending) : undefined;
  };
  const primarySort = state.sort.find(item => columns.some(column => column.id === item.columnId && column.sortKey !== undefined));
  const selection = (row: T, key: K, index: number) => <Checkbox aria-label={tableMessage(strings.selectRow, 'row', index + 1)} value={state.selectedKeys.includes(key)} disabled={isRowSelectable?.(row) === false} onValueChange={() => select(key)} />;
  const actions = (row: T, index: number) => rowActions ? <ActionMenu data={row} actions={rowActions} label={tableMessage(strings.actions, 'row', index + 1)} /> : null;
  const disclosure = (row: T, key: K, index: number) => expansion ? <Disclosure open={expandedKeys!.includes(key)} label={tableMessage(expandedKeys!.includes(key) ? strings.collapseRow : strings.expandRow, 'row', index + 1)} onToggle={() => onExpandedKeysChange!(toggleKey(expandedKeys!, key))}>{expandedKeys!.includes(key) ? renderExpanded!(row) : null}</Disclosure> : null;
  return <div ref={ref} className={cx('nova-data-table', className)} style={style} data-testid={testId}>
    <div className="nova-data-table__title">{slots?.title}</div>
    {(slots?.filter !== undefined || slots?.quickSearchRight !== undefined) ? <div className="nova-data-table__toolbar">{slots.filter}{slots.quickSearchRight}</div> : null}
    <div className="nova-data-table__commands">{slots?.commandHeader}</div>{slots?.group?.(rows)}
    {errorMessage !== undefined ? <div role="alert"><DataState state="error" message={errorMessage} onRetry={onRetry} /></div> : null}
    {loading ? <Spinner label={rows.length ? scope.strings.feedback.refreshing : scope.strings.feedback.loading} /> : null}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The named overflow region needs keyboard scroll access. */}
    <div role="region" aria-label={caption} tabIndex={0} className={cx('nova-data-table__scroll', renderMobileRow && 'nova-data-table__scroll--mobile-renderer')}>
      <table aria-busy={loading || undefined} className="nova-data-table__table">
        <caption>{caption}</caption>
        <colgroup><col />{columns.map(column => <col key={column.id} width={column.minWidth} />)}{rowActions ? <col /> : null}{expansion ? <col /> : null}</colgroup>
        <thead><tr><th scope="col">{pageSelection()}</th>
          {columns.map(column => { const current = state.sort.find(item => item.columnId === column.id); return <th scope="col" key={column.id} aria-description={sortDescription(column.id)} aria-sort={column.sortKey !== undefined ? primarySort?.columnId === column.id ? primarySort.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}>{column.sortKey !== undefined ? <Button variant="ghost" onClick={() => sort(column.id)}>{column.header}<span aria-hidden="true">{current?.direction === 'asc' ? ' ↑' : current?.direction === 'desc' ? ' ↓' : ''}</span></Button> : column.header}</th>; })}
          {rowActions ? <th scope="col">{strings.actions.replaceAll('{row}', '').trim()}</th> : null}{expansion ? <th scope="col">{strings.expandRow.replaceAll('{row}', '').trim()}</th> : null}
        </tr></thead>
        <tbody>{loading && !rows.length ? <tr aria-hidden="true"><td colSpan={1 + columns.length + Number(!!rowActions) + Number(expansion)}><Skeleton shape="rect" /></td></tr> : null}{rows.map((row, index) => { const key = map.keys[index]!; return <Fragment key={map.encoded[index]}><tr aria-selected={state.selectedKeys.includes(key)}><td>{selection(row, key, index)}</td>{columns.map(column => <td key={column.id}>{column.cell(row)}</td>)}{rowActions ? <td>{actions(row, index)}</td> : null}{expansion ? <td>{disclosure(row, key, index)}</td> : null}</tr></Fragment>; })}</tbody>
      </table>
    </div>
    {renderMobileRow ? <div className="nova-data-table__mobile" role="group" aria-label={caption} aria-busy={loading || undefined}>
      <div className="nova-data-table__toolbar">{pageSelection()}{columns.filter(column => column.sortKey !== undefined).map(column => <Button key={column.id} variant="ghost" aria-pressed={state.sort.some(item => item.columnId === column.id)} aria-description={sortDescription(column.id)} onClick={() => sort(column.id)}>{column.header}</Button>)}</div>
      {loading && !rows.length ? <Skeleton shape="rect" /> : null}
      <div role="list" aria-label={caption}>{rows.map((row, index) => { const key = map.keys[index]!; return <div role="listitem" key={map.encoded[index]} className="nova-data-table__card">{selection(row, key, index)}{renderMobileRow(row)}{actions(row, index)}{disclosure(row, key, index)}</div>; })}</div>
    </div> : null}
    {!loading && !rows.length && errorMessage === undefined ? <DataState state="empty" /> : null}
    <TablePagination page={state.page} onPageChange={page => onStateChange({ ...state, page })} total={total} hasNextPage={hasNextPage} />
    <div className="nova-data-table__footer">{slots?.footer}</div>
  </div>;
}
