import { intlLocale } from '../../i18n/resolve-strings.js';
import type { DiagnosticOwner } from '../../lib/diagnostics.js';
import { defaultSerializeKey } from '../../lib/radio-key.js';
import type { NovaScope } from '../../providers/nova/context.js';
import type { Key } from '../../types/index.js';

export type PageState = { pageIndex: number; pageSize: number };
/** Page-size choices TablePagination offers when `pageSizeOptions` is omitted. */
export const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = Object.freeze([20, 50, 100]);
/** Suggested initial `pageSize` for consumer-owned PageState. */
export const DEFAULT_PAGE_SIZE = 20;
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
export function validPage(page: PageState, total: number | undefined, pageSizeOptions?: readonly number[]) {
  return Number.isSafeInteger(page.pageIndex) && page.pageIndex >= 0 && Number.isSafeInteger(page.pageSize) && page.pageSize > 0
    && (total === undefined || (Number.isSafeInteger(total) && total >= 0))
    && (pageSizeOptions === undefined || (Array.isArray(pageSizeOptions) && pageSizeOptions.every(size => Number.isSafeInteger(size) && size > 0)));
}
/** Ascending unique choices; the current size stays listed even when the consumer omits it. Empty: no control. */
export function pageSizeChoices(options: readonly number[] | undefined, current: number): number[] {
  const choices = options ?? DEFAULT_PAGE_SIZE_OPTIONS;
  return choices.length ? [...new Set([...choices, current])].sort((a, b) => a - b) : [];
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
export type TableStrings = { sortPriority: string; sortAscending: string; sortDescending: string; selection: string; selectRow: string; actions: string; expandRow: string; collapseRow: string; previous: string; next: string; first: string; last: string; page: string; range: string; rangeUnknown: string; pageSizeLabel: string; pagination: string };
const en: TableStrings = { sortPriority: 'Sort priority {priority}: {direction}', sortAscending: 'Ascending', sortDescending: 'Descending', selection: 'Select current page', selectRow: 'Select row {row}', actions: 'Row actions {row}', expandRow: 'Expand row {row}', collapseRow: 'Collapse row {row}', previous: 'Previous page', next: 'Next page', first: 'First page', last: 'Last page', page: 'Page {page}', range: '{start}–{end} of {total}', rangeUnknown: '{start}–{end}', pageSizeLabel: 'Rows per page', pagination: 'Table pagination' };
const vi: TableStrings = { sortPriority: 'Thứ tự sắp xếp {priority}: {direction}', sortAscending: 'Tăng dần', sortDescending: 'Giảm dần', selection: 'Chọn trang hiện tại', selectRow: 'Chọn hàng {row}', actions: 'Thao tác hàng {row}', expandRow: 'Mở rộng hàng {row}', collapseRow: 'Thu gọn hàng {row}', previous: 'Trang trước', next: 'Trang sau', first: 'Trang đầu', last: 'Trang cuối', page: 'Trang {page}', range: '{start}–{end} trên {total}', rangeUnknown: '{start}–{end}', pageSizeLabel: 'Số hàng mỗi trang', pagination: 'Phân trang bảng' };
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
    first: navigation.tableFirst ?? fallback.first,
    last: navigation.tableLast ?? fallback.last,
    page: navigation.tablePage ?? fallback.page,
    range: navigation.tableRange ?? fallback.range,
    rangeUnknown: navigation.tableRangeUnknown ?? fallback.rangeUnknown,
    pageSizeLabel: navigation.tablePageSizeLabel ?? fallback.pageSizeLabel,
    pagination: navigation.tablePagination ?? fallback.pagination,
    sortPriority: navigation.tableSortPriority ?? fallback.sortPriority,
    sortAscending: navigation.tableSortAscending ?? fallback.sortAscending,
    sortDescending: navigation.tableSortDescending ?? fallback.sortDescending,
  };
}
export function tableMessage(template: string, name: string, value: number | string): string { return template.replaceAll(`{${name}}`, String(value)); }
/** Grouped integer for counts and row numbers in the pagination range. */
export function tableNumber(locale: string, value: number): string { return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value); }
