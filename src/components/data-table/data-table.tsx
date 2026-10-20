'use client';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type Ref, type RefObject } from 'react';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { Key, MenuAction, SurfaceProps } from '../../types/index.js';
import { ActionMenuView } from '../action-menu/action-menu.js';
import { Button, IconButton } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { DataState } from '../data-state/data-state.js';
import { Spinner } from '../data-state/spinner.js';
import { Skeleton } from '../data-state/skeleton.js';
import { reportTableDiagnostic, rowKeys, selectPage, tableMessage, tableStrings, toggleKey, validPage, type TableDiagnostic, type TableState } from './data-table-model.js';
import { PaginationView } from './table-pagination.js';

export type Column<T> = { id: string; header: ReactNode; cell: (row: T) => ReactNode; sortKey?: string; minWidth?: number };
export type DataTableProps<T, K extends Key> = SurfaceProps & {
  rows: readonly T[]; getRowKey: (row: T) => K; columns: readonly Column<T>[];
  state: TableState<K>; onStateChange: (state: TableState<K>) => void;
  total?: number; hasNextPage?: boolean; isRowSelectable?: (row: T) => boolean;
  /** Forwarded to the built-in TablePagination. */
  pageSizeOptions?: readonly number[]; showFirstLast?: boolean;
  expandedKeys?: readonly K[]; onExpandedKeysChange?: (keys: readonly K[]) => void;
  /** `empty` replaces the default Empty state when there are no rows. */
  slots?: { title?: ReactNode; footer?: ReactNode; quickSearchRight?: ReactNode; group?: (rows: readonly T[]) => ReactNode; filter?: ReactNode; commandHeader?: ReactNode; empty?: ReactNode };
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
type Expansion = { open: boolean; label: string; onToggle: () => void; detail: ReactNode };
/** Owns one disclosure's return focus. The owner renders after the details it may lose. */
function useDisclosure(open: boolean) {
  const trigger = useRef<HTMLButtonElement>(null), restoreFocus = useRef(false), id = useId();
  useLayoutEffect(() => {
    // React restores an ancestor's pre-commit focus before layout effects run.
    // Recover after that restoration, only for the disclosure that lost details.
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      if (trigger.current?.isConnected) trigger.current.focus();
    }
  }, [open]);
  return { trigger, restoreFocus, id };
}
function DisclosureButton({ expansion, trigger, detailsId }: { expansion: Expansion; trigger: RefObject<HTMLButtonElement | null>; detailsId: string }) {
  return <IconButton ref={trigger} variant="ghost" size="sm" className="nova-data-table__disclosure" label={expansion.label} icon={<Icon name="chevron-right" />} aria-expanded={expansion.open} aria-controls={expansion.open ? detailsId : undefined} onClick={expansion.onToggle} />;
}
/** Mobile card: the details follow the disclosure inside the card. */
function Disclosure({ expansion }: { expansion: Expansion }) {
  const { trigger, restoreFocus, id } = useDisclosure(expansion.open);
  return <><DisclosureButton expansion={expansion} trigger={trigger} detailsId={id} />{expansion.open ? <Details restoreFocus={restoreFocus} id={id}>{expansion.detail}</Details> : null}</>;
}
/** Table row: the disclosure follows the selection cell; open details span the next full-width row. */
function BodyRow({ selected, selection, cells, actions, expansion, colSpan }: { selected: boolean; selection: ReactNode; cells: ReactNode; actions: ReactNode; expansion?: Expansion; colSpan: number }) {
  const { trigger, restoreFocus, id } = useDisclosure(expansion?.open === true);
  return <>
    <tr aria-selected={selected}><td className="nova-data-table__select">{selection}</td>{expansion ? <td className="nova-data-table__expand"><DisclosureButton expansion={expansion} trigger={trigger} detailsId={id} /></td> : null}{cells}{actions}</tr>
    {expansion?.open ? <tr className="nova-data-table__detail-row"><td colSpan={colSpan} className="nova-data-table__detail-cell"><Details restoreFocus={restoreFocus} id={id}>{expansion.detail}</Details></td></tr> : null}
  </>;
}
/** Decorative sort state; the header keeps its aria-sort and the button its sort description. */
function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return <span aria-hidden="true" className={cx('nova-data-table__sort-icon', !direction && 'nova-data-table__sort-icon--none')}>
    {direction ? <Icon name={direction === 'asc' ? 'sort-asc' : 'sort-desc'} /> : <svg className="nova-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 6l3-3 3 3M5 10l3 3 3-3" /></svg>}
  </span>;
}
const errorIcon = <svg className="nova-data-table__error-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11h.01" /></svg>;
/** Native table over already loaded rows; every business state change is a proposal. */
export function DataTable<T, K extends Key>({ rows, getRowKey, columns, state, onStateChange, total, hasNextPage, isRowSelectable, pageSizeOptions, showFirstLast, expandedKeys, onExpandedKeysChange, slots, loading = false, errorMessage, onRetry, rowActions, renderMobileRow, renderExpanded, caption, className, style, 'data-testid': testId, ref }: DataTableProps<T, K>) {
  const scope = useNovaScope(), strings = tableStrings(scope), map = rowKeys(rows, getRowKey), baseId = useId();
  const expansion = expandedKeys !== undefined && onExpandedKeysChange !== undefined && renderExpanded !== undefined;
  const partialExpansion = expandedKeys !== undefined || onExpandedKeysChange !== undefined || renderExpanded !== undefined;
  let error: TableDiagnostic | undefined = map.error;
  if (state.selectedKeys.some(key => typeof key === 'number' && !Number.isFinite(key)) || expandedKeys?.some(key => typeof key === 'number' && !Number.isFinite(key))) error = 'NOVA_TABLE_NONFINITE_KEY';
  if (!validPage(state.page, total, pageSizeOptions) || !caption.trim() || !columns.length || new Set(columns.map(column => column.id)).size !== columns.length || columns.some(column => !column.id || (column.minWidth !== undefined && (!Number.isFinite(column.minWidth) || column.minWidth < 0)))) error = 'NOVA_TABLE_INVALID_CONFIGURATION';
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
  // Sort priority describes the sort button. The text stays hidden so it never joins the column header name.
  const descriptionId = (index: number) => `${baseId}-sort-${index}`;
  const primarySort = state.sort.find(item => columns.some(column => column.id === item.columnId && column.sortKey !== undefined));
  const selection = (row: T, key: K, index: number) => <Checkbox aria-label={tableMessage(strings.selectRow, 'row', index + 1)} value={state.selectedKeys.includes(key)} disabled={isRowSelectable?.(row) === false} onValueChange={() => select(key)} />;
  const actions = (row: T, index: number) => rowActions ? <ActionMenuView data={row} actions={rowActions} label={tableMessage(strings.actions, 'row', index + 1)} iconTrigger /> : null;
  const expansionOf = (row: T, key: K, index: number): Expansion | undefined => {
    if (!expansion) return undefined;
    const open = expandedKeys!.includes(key);
    return { open, label: tableMessage(open ? strings.collapseRow : strings.expandRow, 'row', index + 1), onToggle: () => onExpandedKeysChange!(toggleKey(expandedKeys!, key)), detail: open ? renderExpanded!(row) : null };
  };
  const colSpan = 1 + Number(expansion) + columns.length + Number(!!rowActions);
  return <div ref={ref} className={cx('nova-data-table', className)} style={style} data-testid={testId}>
    <div className="nova-data-table__title">{slots?.title}</div>
    {(slots?.filter !== undefined || slots?.quickSearchRight !== undefined) ? <div className="nova-data-table__toolbar">{slots.filter}{slots.quickSearchRight}</div> : null}
    <div className="nova-data-table__commands">{slots?.commandHeader}</div>{slots?.group?.(rows)}
    {errorMessage !== undefined ? <div role="alert" className="nova-data-table__error">{errorIcon}<DataState state="error" message={errorMessage} onRetry={onRetry} /></div> : null}
    {loading ? <Spinner className="nova-data-table__status" label={rows.length ? scope.strings.feedback.refreshing : scope.strings.feedback.loading} /> : null}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The named overflow region needs keyboard scroll access. */}
    <div role="region" aria-label={caption} tabIndex={0} className={cx('nova-data-table__scroll', renderMobileRow && 'nova-data-table__scroll--mobile-renderer')}>
      <table aria-busy={loading || undefined} className="nova-data-table__table">
        <caption>{caption}</caption>
        <colgroup><col className="nova-data-table__col-select" />{expansion ? <col className="nova-data-table__col-expand" /> : null}{columns.map(column => <col key={column.id} width={column.minWidth} />)}{rowActions ? <col className="nova-data-table__col-actions" /> : null}</colgroup>
        <thead><tr><th scope="col" className="nova-data-table__select">{pageSelection()}</th>
          {expansion ? <th scope="col" className="nova-data-table__expand"><span className="nova-visually-hidden">{strings.expandRow.replaceAll('{row}', '').trim()}</span></th> : null}
          {columns.map((column, index) => { const current = state.sort.find(item => item.columnId === column.id), description = sortDescription(column.id); return <th scope="col" key={column.id} aria-sort={column.sortKey !== undefined ? primarySort?.columnId === column.id ? primarySort.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}>{column.sortKey !== undefined ? <><Button variant="ghost" size="sm" className="nova-data-table__sort" aria-describedby={description ? descriptionId(index) : undefined} onClick={() => sort(column.id)}>{column.header}<SortIcon direction={current?.direction} /></Button>{description ? <span id={descriptionId(index)} hidden>{description}</span> : null}</> : column.header}</th>; })}
          {rowActions ? <th scope="col" className="nova-data-table__actions"><span className="nova-visually-hidden">{strings.actions.replaceAll('{row}', '').trim()}</span></th> : null}
        </tr></thead>
        <tbody>{loading && !rows.length ? <tr aria-hidden="true"><td colSpan={colSpan}><Skeleton shape="rect" /></td></tr> : null}{rows.map((row, index) => { const key = map.keys[index]!; return <BodyRow key={map.encoded[index]} selected={state.selectedKeys.includes(key)} selection={selection(row, key, index)} cells={columns.map(column => <td key={column.id}>{column.cell(row)}</td>)} actions={rowActions ? <td className="nova-data-table__actions">{actions(row, index)}</td> : null} expansion={expansionOf(row, key, index)} colSpan={colSpan} />; })}</tbody>
      </table>
    </div>
    {renderMobileRow ? <div className="nova-data-table__mobile" role="group" aria-label={caption} aria-busy={loading || undefined}>
      <div className="nova-data-table__toolbar">{pageSelection()}{columns.map((column, index) => column.sortKey === undefined ? null : <Button key={column.id} variant="ghost" aria-pressed={state.sort.some(item => item.columnId === column.id)} aria-describedby={sortDescription(column.id) ? descriptionId(index) : undefined} onClick={() => sort(column.id)}>{column.header}</Button>)}</div>
      {loading && !rows.length ? <Skeleton shape="rect" /> : null}
      <div role="list" aria-label={caption}>{rows.map((row, index) => { const key = map.keys[index]!, rowExpansion = expansionOf(row, key, index); return <div role="listitem" key={map.encoded[index]} className="nova-data-table__card">{selection(row, key, index)}{renderMobileRow(row)}{actions(row, index)}{rowExpansion ? <Disclosure expansion={rowExpansion} /> : null}</div>; })}</div>
    </div> : null}
    {!loading && !rows.length && errorMessage === undefined ? slots?.empty !== undefined ? <div className="nova-data-table__empty">{slots.empty}</div> : <DataState state="empty" className="nova-data-table__empty" /> : null}
    <PaginationView page={state.page} onPageChange={page => onStateChange({ ...state, page })} total={total} hasNextPage={hasNextPage} pageSizeOptions={pageSizeOptions} showFirstLast={showFirstLast} rowCount={loading ? undefined : rows.length} />
    <div className="nova-data-table__footer">{slots?.footer}</div>
  </div>;
}
