// Server-compatible (D-014): decorative placeholder, always aria-hidden; the
// loading region (DataState) carries aria-busy/status text.
import type { Ref } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';

export type SkeletonProps = SurfaceProps & { shape?: 'text' | 'rect' | 'circle'; ref?: Ref<HTMLDivElement> };

export function Skeleton({ shape = 'text', className, style, 'data-testid': testId, ref }: SkeletonProps) {
  return <div ref={ref} aria-hidden="true" className={cx('nova-skeleton', `nova-skeleton--${shape}`, className)} style={style} data-testid={testId} />;
}
