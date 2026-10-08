// Accessible-name resolution (INV-009, D-019): decided at render, so server and
// client agree; failures become an accessible configuration error, never an
// unnamed control.
import { Fragment, isValidElement, type ReactNode } from 'react';

import type { DiagnosticCode } from './diagnostics.js';

/** What a Field exposes to its single nameFromField control. */
export type FieldLink = {
  controlId: string;
  labelId: string;
  descriptionId: string | undefined;
  errorId: string | undefined;
  required: boolean;
  invalid: boolean;
  labelEmpty: boolean;
};

export type NameSource = {
  label?: ReactNode;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  nameFromField?: boolean | undefined;
};

export type NameResolution =
  | { ok: true; kind: 'label'; label: ReactNode }
  | { ok: true; kind: 'aria-label'; ariaLabel: string }
  | { ok: true; kind: 'aria-labelledby'; ariaLabelledby: string }
  | { ok: true; kind: 'field'; field: FieldLink }
  | { ok: false; code: Extract<DiagnosticCode, 'NOVA_ACCESSIBLE_NAME_EMPTY' | 'NOVA_NAME_FROM_FIELD_OUTSIDE' | 'NOVA_FIELD_EMPTY_LABEL'> };

type ElementProps = {
  children?: ReactNode;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: unknown;
  'aria-labelledby'?: unknown;
  alt?: unknown;
  title?: unknown;
  hidden?: unknown;
  style?: { display?: unknown; visibility?: unknown } | null;
};

const named = (value: unknown) => typeof value === 'string' && value.trim() !== '';

const cssKeyword = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Hidden from the accessibility tree, so the whole subtree contributes no name. */
function isHidden(props: ElementProps): boolean {
  if (props['aria-hidden'] === true || props['aria-hidden'] === 'true') return true;
  if (props.hidden !== undefined && props.hidden !== null && props.hidden !== false) return true;
  const display = cssKeyword(props.style?.display);
  const visibility = cssKeyword(props.style?.visibility);
  return display === 'none' || visibility === 'hidden' || visibility === 'collapse';
}

/**
 * True when the node contributes no accessible text. Fragments and intrinsic
 * elements are inspected (aria-hidden, `hidden`, display: none and visibility:
 * hidden/collapse subtrees contribute nothing; aria-label, aria-labelledby, alt
 * and title count as text). Raw HTML is not accepted
 * (INV-010), so it never counts as a name. Custom components are opaque here:
 * their eventual DOM name is checked at integration, never assumed empty.
 */
export function isEmptyLabel(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') return true;
  if (typeof node === 'string') return node.trim() === '';
  if (typeof node === 'number' || typeof node === 'bigint') return false;
  if (Array.isArray(node)) return node.every((child) => isEmptyLabel(child as ReactNode));
  if (isValidElement<ElementProps>(node)) {
    const props = node.props;
    if (node.type === Fragment) return isEmptyLabel(props.children);
    if (typeof node.type !== 'string') return false;
    if (isHidden(props)) return true;
    if (named(props['aria-label']) || named(props['aria-labelledby']) || named(props.alt) || named(props.title)) return false;
    return isEmptyLabel(props.children);
  }
  return false;
}

const hasText = (value: string | undefined): value is string => typeof value === 'string' && value.trim() !== '';

export function resolveAccessibleName(props: NameSource, field: FieldLink | null): NameResolution {
  if (props.nameFromField) {
    if (!field) return { ok: false, code: 'NOVA_NAME_FROM_FIELD_OUTSIDE' };
    if (field.labelEmpty) return { ok: false, code: 'NOVA_FIELD_EMPTY_LABEL' };
    return { ok: true, kind: 'field', field };
  }
  if (props.label !== undefined) {
    return isEmptyLabel(props.label) ? { ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' } : { ok: true, kind: 'label', label: props.label };
  }
  if (props['aria-label'] !== undefined) {
    return hasText(props['aria-label'])
      ? { ok: true, kind: 'aria-label', ariaLabel: props['aria-label'] }
      : { ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' };
  }
  if (hasText(props['aria-labelledby'])) {
    return { ok: true, kind: 'aria-labelledby', ariaLabelledby: props['aria-labelledby'].trim() };
  }
  return { ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' };
}

/** Space-separated id lists merged in order without duplicates. */
export function mergeIds(...lists: (string | null | undefined)[]): string | undefined {
  const ids: string[] = [];
  for (const list of lists) {
    for (const id of (list ?? '').split(/\s+/u)) if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.length ? ids.join(' ') : undefined;
}
