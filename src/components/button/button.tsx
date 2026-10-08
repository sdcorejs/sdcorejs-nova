'use client';
// Button / IconButton (C01, §11): default type="button"; `loading` keeps focus
// and the visible label, sets aria-busy + aria-disabled and blocks activation
// (preventDefault, so a submit button cannot submit twice); `disabled` is native.
// `render` keeps these semantics on a consumer-supplied native <button>.
import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefCallback,
} from 'react';

import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';

export type ButtonState = { disabled: boolean; loading: boolean };
export type ButtonRender =
  | ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>
  | ((props: ButtonHTMLAttributes<HTMLButtonElement> & { ref: Ref<HTMLButtonElement> }, state: ButtonState) => ReactElement);

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'children'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
  render?: ButtonRender;
  ref?: Ref<HTMLButtonElement>;
};

// Hyphenated JSX attributes escape excess-property checks, so the omitted
// naming props are spelled out as `never` to keep `label` the only name source.
export type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label' | 'aria-labelledby'> & {
  label: string;
  icon: ReactNode;
  'aria-label'?: never;
  'aria-labelledby'?: never;
};

/**
 * Attaches `value` to one ref and returns how to detach it (React 19 semantics):
 * a callback ref's own cleanup when it returns one, otherwise `ref(null)`;
 * object refs are reset to null.
 */
function attachRef<T>(ref: Ref<T> | undefined, value: T): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(value);
    return typeof cleanup === 'function' ? cleanup : () => ref(null);
  }
  if (ref) {
    (ref as { current: T | null }).current = value;
    return () => {
      (ref as { current: T | null }).current = null;
    };
  }
  return undefined;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    if (value === null) return undefined;
    const cleanups = refs.map((ref) => attachRef(ref, value));
    return () => {
      for (const cleanup of cleanups) cleanup?.();
    };
  };
}

type Handler = (event: { defaultPrevented: boolean }) => void;

/** Element handlers run first; the Button's own handler is skipped once the element prevents default. */
function composeHandlers(own: Record<string, unknown>, ours: Record<string, unknown>): Record<string, Handler> {
  const composed: Record<string, Handler> = {};
  for (const [key, mine] of Object.entries(ours)) {
    const theirs = own[key];
    if (!/^on[A-Z]/u.test(key) || typeof mine !== 'function' || typeof theirs !== 'function') continue;
    composed[key] = (event) => {
      (theirs as Handler)(event);
      if (!event.defaultPrevented) (mine as Handler)(event);
    };
  }
  return composed;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  children,
  render,
  ref,
  className,
  onClick,
  ...rest
}: ButtonProps) {
  const element = isValidElement<ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }>(render) ? render : null;
  const ownRef = element?.props.ref;
  // memoized so a rerender with the same refs neither detaches nor re-attaches them
  // eslint-disable-next-line react-hooks/refs -- refs are forwarded, never read during render
  const mergedRef = useMemo(() => mergeRefs(ownRef, ref), [ownRef, ref]);
  const ownClick = element?.props.onClick;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // loading blocks every activation, including the render element's own handler
    if (loading) {
      event.preventDefault();
      return;
    }
    ownClick?.(event);
    if (event.defaultPrevented) return;
    onClick?.(event);
  };

  const props: ButtonHTMLAttributes<HTMLButtonElement> = {
    ...rest,
    type,
    disabled: disabled || undefined,
    'aria-disabled': loading ? true : rest['aria-disabled'],
    'aria-busy': loading ? true : rest['aria-busy'],
    className: cx('nova-button', `nova-button--${variant}`, `nova-button--${size}`, loading && 'nova-button--loading', className),
    onClick: handleClick,
    // the loading indicator is drawn by CSS without taking inline space (stable width, C01)
    children: <span className="nova-button__label">{children}</span>,
  };
  const state: ButtonState = { disabled, loading };

  // The ref is forwarded to the consumer's <button>, never read during render.
  // eslint-disable-next-line react-hooks/refs
  if (typeof render === 'function') return render({ ...props, ref: ref ?? null }, state);
  if (element) {
    const own = element.props;
    const ownRest: Record<string, unknown> = { ...own };
    delete ownRest.onClick;
    return cloneElement(element, {
      ...ownRest,
      ...props,
      ...composeHandlers(ownRest, props as Record<string, unknown>),
      onClick: handleClick,
      className: cx(own.className, props.className),
      ref: mergedRef,
    } as ButtonHTMLAttributes<HTMLButtonElement>);
  }
  return <button ref={ref} {...props} />;
}

export function IconButton({ label, icon, className, ...rest }: IconButtonProps) {
  const { strings } = useNovaScope();
  const report = useDiagnostics('IconButton');
  const named = typeof label === 'string' && label.trim() !== '';
  useEffect(() => {
    if (!named) report('NOVA_ACCESSIBLE_NAME_EMPTY');
  }, [named, report]);
  if (!named) {
    return <span className="nova-config-error" data-nova-config-error="NOVA_ACCESSIBLE_NAME_EMPTY">{strings.forms.configurationError}</span>;
  }
  return (
    <Button {...rest} aria-label={label} className={cx('nova-icon-button', className)}>
      <span className="nova-icon-button__icon" aria-hidden="true">{icon}</span>
    </Button>
  );
}
