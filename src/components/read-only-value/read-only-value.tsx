import type { ReactNode } from 'react';

import { cx } from '../../lib/cx.js';
import type { SurfaceProps } from '../../types/index.js';
import { Link } from '../link/link.js';
import { EmptyValue } from './empty-value.js';

export type ReadOnlyValueProps<T> = SurfaceProps & {value:T;display:ReactNode;label?:ReactNode;href?:string;renderValue?:(raw:T)=>ReactNode};
export type ViewProps<T> = SurfaceProps & {label:ReactNode;value:T;display:ReactNode;renderValue?:(raw:T)=>ReactNode};

function visible(display: ReactNode): ReactNode { return display == null || display === '' ? <EmptyValue/> : typeof display === 'boolean' ? String(display) : display; }

export function ReadOnlyValue<T>({value,display,label,href,renderValue,className,style,'data-testid':testId}:ReadOnlyValueProps<T>) {
  const content=visible(renderValue ? renderValue(value) : display);
  const face=href === undefined ? content : <Link href={href}>{content}</Link>;
  if(label !== undefined) return <dl className={cx('nova-read-only-value',className)} style={style} data-testid={testId}><dt>{visible(label)}</dt><dd>{face}</dd></dl>;
  return <span className={cx('nova-read-only-value',className)} style={style} data-testid={testId}>{face}</span>;
}

export function View<T>({label,value,display,renderValue,className,style,'data-testid':testId}:ViewProps<T>) {
  return <dl className={cx('nova-view',className)} style={style} data-testid={testId}><dt>{visible(label)}</dt><dd><ReadOnlyValue value={value} display={display} renderValue={renderValue}/></dd></dl>;
}
