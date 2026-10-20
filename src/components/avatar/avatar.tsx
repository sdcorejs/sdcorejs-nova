'use client';
// Avatar / AvatarGroup (C03) on Base UI Avatar. The root is the single named
// image (role=img, name = alt ?? name ?? localized "user"); the inner <img> and
// the initials are hidden from AT so nothing is announced twice. Initials are
// grapheme-based and deterministic, so server and client agree (INV-003).
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { Children, Fragment, cloneElement, isValidElement, useEffect, type ReactElement, type ReactNode, type Ref } from 'react';

import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { formatMessage } from '../../i18n/resolve-strings.js';
import { cx } from '../../lib/cx.js';
import { initials } from '../../lib/graphemes.js';
import type { SurfaceProps } from '../../types/index.js';

export type AvatarProps = SurfaceProps & {
  name: string;
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  decorative?: boolean;
  ref?: Ref<HTMLSpanElement>;
};

export type AvatarGroupProps = SurfaceProps & {
  children: ReactNode;
  label: string;
  max?: number;
  ref?: Ref<HTMLDivElement>;
};

// Stroked 16×16 person, matching the internal decorative icon set (1.5 stroke, currentColor).
function PersonIcon() {
  return (
    <svg
      className="nova-avatar__icon"
      viewBox="0 0 16 16"
      focusable="false"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5zM2.75 13.75c.6-2.6 2.6-4 5.25-4s4.65 1.4 5.25 4" />
    </svg>
  );
}

export function Avatar({ name, src, alt, size = 'md', decorative = false, className, style, 'data-testid': testId, ref }: AvatarProps) {
  const { strings } = useNovaScope();
  const letters = initials(name);
  const accessibleName = alt?.trim() || name.trim() || strings.common.avatarUnknown;
  return (
    <BaseAvatar.Root
      ref={ref}
      className={cx('nova-avatar', `nova-avatar--${size}`, className)}
      style={style}
      data-testid={testId}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleName}
      aria-hidden={decorative ? true : undefined}
    >
      {src ? <BaseAvatar.Image src={src} alt="" className="nova-avatar__image" /> : null}
      <BaseAvatar.Fallback className="nova-avatar__fallback" aria-hidden="true">
        {letters || <PersonIcon />}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}

/**
 * Group items: Fragments are transparent grouping, so their children are counted
 * one by one. Keys inside Fragments encode the whole key path as a JSON array, so
 * distinct paths never collide. Like React, an unkeyed Fragment passed as the whole
 * `children` is transparent for identity. Other elements are single items; their
 * DOM is never inspected.
 */
const isFragment = (node: ReactNode): node is ReactElement<{ children?: ReactNode }> =>
  isValidElement(node) && node.type === Fragment;

function groupItems(children: ReactNode, path: readonly string[] = []): ReactNode[] {
  const list = path.length === 0 && isFragment(children) && children.key === null ? children.props.children : children;
  return Children.toArray(list).flatMap((child) => {
    if (isFragment(child)) return groupItems(child.props.children, [...path, String(child.key)]);
    return isValidElement(child) && path.length > 0
      ? [cloneElement(child, { key: JSON.stringify([...path, String(child.key)]) })]
      : [child];
  });
}

export function AvatarGroup({ children, label, max, className, style, 'data-testid': testId, ref }: AvatarGroupProps) {
  const { strings, locale } = useNovaScope();
  const report = useDiagnostics('AvatarGroup');
  const invalidMax = max !== undefined && (!Number.isFinite(max) || max < 1);
  useEffect(() => {
    if (invalidMax) report('NOVA_AVATAR_INVALID_MAX');
  }, [invalidMax, report]);

  const items = groupItems(children);
  const limit = max === undefined || invalidMax ? items.length : Math.floor(max);
  const visible = items.slice(0, limit);
  const hidden = items.length - visible.length;
  // The "+N" avatar takes the size of the group's own avatars (read from props, never the DOM).
  const size = visible.reduce<NonNullable<AvatarProps['size']> | undefined>(
    (found, item) => found ?? (isValidElement<AvatarProps>(item) && item.type === Avatar ? item.props.size ?? 'md' : undefined),
    undefined,
  ) ?? 'md';

  return (
    <div ref={ref} role="group" aria-label={label} className={cx('nova-avatar-group', className)} style={style} data-testid={testId}>
      {visible}
      {hidden > 0 ? (
        <span
          className={cx('nova-avatar', `nova-avatar--${size}`, 'nova-avatar--overflow')}
          role="img"
          aria-label={formatMessage(strings.navigation.avatarOverflow, locale, { count: hidden })}
        >
          <span aria-hidden="true">{`+${hidden}`}</span>
        </span>
      ) : null}
    </div>
  );
}
