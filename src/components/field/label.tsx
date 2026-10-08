// Server-compatible label (D-014): no hooks, no context, no directive.
import type { LabelHTMLAttributes, ReactNode, Ref } from 'react';

import { cx } from '../../lib/cx.js';

export type LabelProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> & {
  children: ReactNode;
  required?: boolean;
  ref?: Ref<HTMLLabelElement>;
};

/** Native label; the required marker is visual only (native `required` conveys it). */
export function Label({ children, required = false, className, ref, ...rest }: LabelProps) {
  return (
    <label ref={ref} className={cx('nova-label', className)} {...rest}>
      {children}
      {required ? <span className="nova-label__required" aria-hidden="true">{'\u00a0*'}</span> : null}
    </label>
  );
}
