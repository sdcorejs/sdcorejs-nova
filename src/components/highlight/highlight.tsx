import type { ReactNode } from 'react';

import { cx } from '../../lib/cx.js';
import { findHighlightRanges } from '../../lib/highlight-ranges.js';
import type { SurfaceProps } from '../../types/index.js';

export type HighlightProps = SurfaceProps & {text: string | number | null | undefined; term: string | null | undefined};

export function Highlight({text,term,className,style,'data-testid':testId}: HighlightProps) {
  const original = text == null ? '' : String(text), content: ReactNode[] = []; let cursor=0;
  for (const {start,end} of findHighlightRanges(original,term ?? '')) {
    content.push(original.slice(cursor,start),<mark key={start}>{original.slice(start,end)}</mark>); cursor=end;
  }
  content.push(original.slice(cursor));
  return <span className={cx('nova-highlight',className)} style={style} data-testid={testId}>{content}</span>;
}
