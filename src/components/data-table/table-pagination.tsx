'use client';
import { useEffect, useId, type Ref } from 'react';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { SurfaceProps } from '../../types/index.js';
import { IconButton } from '../button/button.js';
import { Select } from '../select/select.js';
import { pageSizeChoices, reportTableDiagnostic, tableMessage, tableNumber, tableStrings, validPage, type PageState } from './data-table-model.js';

export type TablePaginationProps = SurfaceProps & {
  page: PageState; onPageChange: (page: PageState) => void; total?: number; hasNextPage?: boolean;
  /** Page-size choices. Omitted: `DEFAULT_PAGE_SIZE_OPTIONS`; empty: no page-size control. The current size is always listed. */
  pageSizeOptions?: readonly number[];
  /** Adds First and Last page buttons; Last needs a known total. */
  showFirstLast?: boolean;
  ref?: Ref<HTMLElement>;
};
/** DataTable also knows how many rows the current page holds when the total is unknown. */
type PaginationViewProps = TablePaginationProps & { rowCount?: number };
function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [name, value]) => tableMessage(text, name, value), template);
}
/** Controlled page navigation. Unknown totals never imply a last page. */
export function TablePagination(props: TablePaginationProps) {
  return <PaginationView {...props} rowCount={undefined} />;
}
export function PaginationView({ page, onPageChange, total, hasNextPage, pageSizeOptions, showFirstLast = false, rowCount, className, style, 'data-testid': testId, ref }: PaginationViewProps) {
  const scope = useNovaScope(), strings = tableStrings(scope), valid = validPage(page, total, pageSizeOptions), labelId = useId();
  useEffect(() => {
    if (!valid) reportTableDiagnostic(scope.diagnostics, 'NOVA_TABLE_INVALID_CONFIGURATION', 'TablePagination');
    if (total === undefined && hasNextPage === undefined) reportTableDiagnostic(scope.diagnostics, 'NOVA_TABLE_UNKNOWN_TOTAL', 'TablePagination');
  }, [valid, total, hasNextPage, scope.diagnostics]);
  if (!valid) return <span data-nova-config-error="NOVA_TABLE_INVALID_CONFIGURATION">{scope.strings.forms.configurationError}</span>;
  const pages = total === undefined ? undefined : Math.max(1, Math.ceil(total / page.pageSize));
  const next = pages === undefined ? hasNextPage === true : page.pageIndex < pages - 1;
  const sizes = pageSizeChoices(pageSizeOptions, page.pageSize), number = (value: number) => tableNumber(scope.locale, value);
  // Rows on this page: exact for a known total, a full page before an explicit next page, otherwise only what DataTable holds.
  const first = page.pageIndex * page.pageSize + 1;
  const count = total !== undefined ? Math.max(0, Math.min(page.pageSize, total - first + 1)) : hasNextPage === true ? page.pageSize : rowCount;
  const bounds = count === undefined ? undefined : { start: number(count ? first : 0), end: number(count ? first + count - 1 : 0) };
  const range = bounds === undefined ? tableMessage(strings.page, 'page', page.pageIndex + 1) : total !== undefined ? fill(strings.range, { ...bounds, total: number(total) }) : fill(strings.rangeUnknown, bounds);
  return <nav ref={ref} aria-label={strings.pagination} className={cx('nova-table-pagination', className)} style={style} data-testid={testId}>
    {sizes.length ? <div className="nova-table-pagination__size">
      <span id={labelId} className="nova-table-pagination__size-label">{strings.pageSizeLabel}</span>
      <Select<number, number> aria-labelledby={labelId} className="nova-table-pagination__select" options={sizes.map(size => ({ key: size, label: number(size), data: size }))} value={page.pageSize} onValueChange={size => { if (size !== null && size !== page.pageSize) onPageChange({ pageIndex: 0, pageSize: size }); }} />
    </div> : null}
    <div className="nova-table-pagination__nav">
      <span className="nova-table-pagination__range">{range}</span>
      <div className="nova-table-pagination__buttons">
        {showFirstLast ? <IconButton variant="ghost" size="sm" className="nova-table-pagination__button" label={strings.first} icon={<Icon name="page-first" />} disabled={total === 0 || page.pageIndex === 0} onClick={() => onPageChange({ ...page, pageIndex: 0 })} /> : null}
        <IconButton variant="ghost" size="sm" className="nova-table-pagination__button" label={strings.previous} icon={<Icon name="chevron-left" />} disabled={total === 0 || page.pageIndex === 0} onClick={() => onPageChange({ ...page, pageIndex: page.pageIndex - 1 })} />
        <IconButton variant="ghost" size="sm" className="nova-table-pagination__button" label={strings.next} icon={<Icon name="chevron-right" />} disabled={!next || page.pageIndex === Number.MAX_SAFE_INTEGER} onClick={() => onPageChange({ ...page, pageIndex: page.pageIndex + 1 })} />
        {showFirstLast && pages !== undefined ? <IconButton variant="ghost" size="sm" className="nova-table-pagination__button" label={strings.last} icon={<Icon name="page-last" />} disabled={page.pageIndex >= pages - 1} onClick={() => onPageChange({ ...page, pageIndex: pages - 1 })} /> : null}
      </div>
    </div>
  </nav>;
}
