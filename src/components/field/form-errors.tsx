'use client';
// Error summary (F01): polite region, links move focus to the field control.
import { useId, type MouseEvent, type Ref } from 'react';

import { useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';
import { focusResolvedTarget } from './focus-first-invalid.js';

export type FormErrorsProps = SurfaceProps & {
  errors: readonly { id: string; message: string; fieldId?: string }[];
  ref?: Ref<HTMLDivElement>;
};

function focusField(event: MouseEvent<HTMLAnchorElement>, fieldId: string): void {
  const element = event.currentTarget.ownerDocument.getElementById(fieldId);
  // keep the link's own navigation when nothing could take focus
  if (element && focusResolvedTarget(element)) event.preventDefault();
}

export function FormErrors({ errors, className, style, 'data-testid': testId, ref }: FormErrorsProps) {
  const { strings } = useNovaScope();
  const titleId = useId();
  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      className={cx('nova-form-errors', className)}
      style={style}
      data-testid={testId}
      role="region"
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <p id={titleId} className="nova-form-errors__title">{strings.forms.errorsTitle}</p>
      <ul className="nova-form-errors__list">
        {errors.map((error) => (
          <li key={error.id}>
            {error.fieldId
              ? <a href={`#${error.fieldId}`} onClick={(event) => focusField(event, error.fieldId!)}>{error.message}</a>
              : error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
