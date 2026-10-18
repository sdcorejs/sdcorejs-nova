import type { DiagnosticOwner } from '../../lib/diagnostics.js';
import { defaultSerializeKey } from '../../lib/radio-key.js';
import type { NovaScope } from '../../providers/nova/context.js';
import type { Key } from '../../types/index.js';

export type PageState = { pageIndex: number; pageSize: number };
export type Sort = { columnId: string; direction: 'asc' | 'desc' };
export type TableState<K extends Key> = { page: PageState; sort: readonly Sort[]; selectedKeys: readonly K[] };
export type TableDiagnostic = 'NOVA_TABLE_DUPLICATE_KEY' | 'NOVA_TABLE_NONFINITE_KEY' | 'NOVA_TABLE_INVALID_CONFIGURATION' | 'NOVA_TABLE_UNKNOWN_TOTAL' | 'NOVA_TABLE_INCOMPLETE_EXPANSION';
const messages: Record<TableDiagnostic, string> = {
  NOVA_TABLE_DUPLICATE_KEY: 'rows must have unique typed keys; rendering a configuration error',
  NOVA_TABLE_NONFINITE_KEY: 'numeric row and selection keys must be finite; rendering a configuration error',
  NOVA_TABLE_INVALID_CONFIGURATION: 'page, total, columns and caption must form a valid table configuration',
  NOVA_TABLE_UNKNOWN_TOTAL: 'unknown totals require explicit hasNextPage; Next is disabled when omitted',
  NOVA_TABLE_INCOMPLETE_EXPANSION: 'expansion requires keys, callback and renderer; incomplete expansion is disabled',
};
declare const process: { env: { NODE_ENV?: string } };
export function reportTableDiagnostic(owner: DiagnosticOwner, code: TableDiagnostic, component: 'DataTable' | 'TablePagination') {
  try { if (process.env.NODE_ENV === 'production') return; } catch { /* No process global in unbundled browsers. */ }
  const key = `${code}|${component}`;
  if (owner.seen.has(key)) return;
  owner.seen.add(key);
  console.warn(`[nova] ${code} <${component}>: ${messages[code]}`);
}
export function validPage(page: PageState, total: number | undefined) {
  return Number.isSafeInteger(page.pageIndex) && page.pageIndex >= 0 && Number.isSafeInteger(page.pageSize) && page.pageSize > 0
    && (total === undefined || (Number.isSafeInteger(total) && total >= 0));
}
export function rowKeys<T, K extends Key>(rows: readonly T[], getRowKey: (row: T) => K): { keys: K[]; encoded: string[]; error?: TableDiagnostic } {
  const keys = rows.map(getRowKey), encoded = keys.map(defaultSerializeKey);
  if (keys.some(key => typeof key === 'number' && !Number.isFinite(key))) return { keys, encoded, error: 'NOVA_TABLE_NONFINITE_KEY' };
  if (new Set(encoded).size !== encoded.length) return { keys, encoded, error: 'NOVA_TABLE_DUPLICATE_KEY' };
  return { keys, encoded };
}
export function toggleKey<K extends Key>(keys: readonly K[], key: K): K[] { return keys.includes(key) ? keys.filter(value => value !== key) : [...keys, key]; }
export function selectPage<K extends Key>(selected: readonly K[], eligible: readonly K[], allSelected: boolean): K[] {
  return allSelected ? selected.filter(key => !eligible.includes(key)) : [...selected, ...eligible.filter(key => !selected.includes(key))];
}
export type TableStrings = { sortPriority: string; sortAscending: string; sortDescending: string; selection: string; selectRow: string; actions: string; expandRow: string; collapseRow: string; previous: string; next: string; page: string; pageOf?: string; pageSize: string; pagination: string };
const en: TableStrings = { sortPriority: 'Sort priority {priority}: {direction}', sortAscending: 'Ascending', sortDescending: 'Descending', selection: 'Select current page', selectRow: 'Select row {row}', actions: 'Row actions {row}', expandRow: 'Expand row {row}', collapseRow: 'Collapse row {row}', previous: 'Previous page', next: 'Next page', page: 'Page {page}', pageOf: 'Page {page} of {pages}', pageSize: 'Rows per page: {size}', pagination: 'Table pagination' };
const vi: TableStrings = { sortPriority: 'Thứ tự sắp xếp {priority}: {direction}', sortAscending: 'Tăng dần', sortDescending: 'Giảm dần', selection: 'Chọn trang hiện tại', selectRow: 'Chọn hàng {row}', actions: 'Thao tác hàng {row}', expandRow: 'Mở rộng hàng {row}', collapseRow: 'Thu gọn hàng {row}', previous: 'Trang trước', next: 'Trang sau', page: 'Trang {page}', pageOf: 'Trang {page} trên {pages}', pageSize: 'Số hàng mỗi trang: {size}', pagination: 'Phân trang bảng' };
export function tableStrings(scope: NovaScope): TableStrings {
  // Preserve the existing catalog namespaces; the integration owner adds
  // optional table-prefixed navigation messages without changing P0/P1 keys.
  const navigation = scope.strings.navigation as typeof scope.strings.navigation & Partial<Record<`table${Capitalize<keyof TableStrings>}`, string>>;
  const fallback = scope.locale.toLowerCase().startsWith('vi') ? vi : en;
  return {
    selection: navigation.tableSelection ?? fallback.selection,
    selectRow: navigation.tableSelectRow ?? fallback.selectRow,
    actions: navigation.tableActions ?? fallback.actions,
    expandRow: navigation.tableExpandRow ?? fallback.expandRow,
    collapseRow: navigation.tableCollapseRow ?? fallback.collapseRow,
    previous: navigation.tablePrevious ?? fallback.previous,
    next: navigation.tableNext ?? fallback.next,
    page: navigation.tablePage ?? fallback.page,
    pageOf: navigation.tablePageOf ?? fallback.pageOf,
    pageSize: navigation.tablePageSize ?? fallback.pageSize,
    pagination: navigation.tablePagination ?? fallback.pagination,
    sortPriority: navigation.tableSortPriority ?? fallback.sortPriority,
    sortAscending: navigation.tableSortAscending ?? fallback.sortAscending,
    sortDescending: navigation.tableSortDescending ?? fallback.sortDescending,
  };
}
export function tableMessage(template: string, name: string, value: number | string): string { return template.replaceAll(`{${name}}`, String(value)); }
