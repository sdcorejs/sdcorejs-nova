'use client';
import { useEffect, type Ref } from 'react';
import { cx } from '../../lib/cx.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { SurfaceProps } from '../../types/index.js';
import { Button } from '../button/button.js';
import { reportTableDiagnostic, tableMessage, tableStrings, validPage, type PageState } from './data-table-model.js';

export type TablePaginationProps = SurfaceProps & { page: PageState; onPageChange: (page: PageState) => void; total?: number; hasNextPage?: boolean; ref?: Ref<HTMLElement> };
/** Controlled page navigation. Unknown totals never imply a last page. */
export function TablePagination({ page, onPageChange, total, hasNextPage, className, style, 'data-testid': testId, ref }: TablePaginationProps) {
  const scope = useNovaScope(), strings = tableStrings(scope), valid = validPage(page, total);
  useEffect(() => {
    if (!valid) reportTableDiagnostic(scope.diagnostics, 'NOVA_TABLE_INVALID_CONFIGURATION', 'TablePagination');
    if (total === undefined && hasNextPage === undefined) reportTableDiagnostic(scope.diagnostics, 'NOVA_TABLE_UNKNOWN_TOTAL', 'TablePagination');
  }, [valid, total, hasNextPage, scope.diagnostics]);
  if (!valid) return <span data-nova-config-error="NOVA_TABLE_INVALID_CONFIGURATION">{scope.strings.forms.configurationError}</span>;
  const next = total === undefined ? hasNextPage === true : page.pageIndex < Math.ceil(total / page.pageSize) - 1;
  return <nav ref={ref} aria-label={strings.pagination} className={cx('nova-table-pagination', className)} style={style} data-testid={testId}>
    <Button variant="secondary" disabled={total === 0 || page.pageIndex === 0} onClick={() => onPageChange({ ...page, pageIndex: page.pageIndex - 1 })}>{strings.previous}</Button>
    <span>{total !== undefined && strings.pageOf ? tableMessage(tableMessage(strings.pageOf, 'pages', Math.max(1, Math.ceil(total / page.pageSize))), 'page', page.pageIndex + 1) : tableMessage(strings.page, 'page', page.pageIndex + 1)}</span>
    <span>{tableMessage(strings.pageSize, 'size', page.pageSize)}</span>
    <Button variant="secondary" disabled={!next || page.pageIndex === Number.MAX_SAFE_INTEGER} onClick={() => onPageChange({ ...page, pageIndex: page.pageIndex + 1 })}>{strings.next}</Button>
  </nav>;
}
