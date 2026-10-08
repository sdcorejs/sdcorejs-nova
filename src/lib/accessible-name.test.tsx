import { describe, expect, it } from 'vitest';

import { isEmptyLabel, mergeIds, resolveAccessibleName, type FieldLink } from './accessible-name.js';

const field: FieldLink = {
  controlId: 'f-control', labelId: 'f-label', descriptionId: 'f-desc', errorId: undefined,
  required: false, invalid: false, labelEmpty: false,
};

describe('isEmptyLabel', () => {
  it.each([[null], [undefined], [false], [true], [''], ['   '], [[]], [[null, '', false]]])('treats %j as empty', (node) => {
    expect(isEmptyLabel(node)).toBe(true);
  });
  it.each([['Email'], [0], [<span key="a">Email</span>], [['', 'x']]])('treats %j as a name', (node) => {
    expect(isEmptyLabel(node)).toBe(false);
  });
});

describe('resolveAccessibleName (INV-009, D-019)', () => {
  it('accepts a visible label', () => {
    expect(resolveAccessibleName({ label: 'Email' }, null)).toEqual({ ok: true, kind: 'label', label: 'Email' });
  });

  it('accepts non-empty aria-label and aria-labelledby', () => {
    expect(resolveAccessibleName({ 'aria-label': 'Tìm kiếm' }, null)).toEqual({ ok: true, kind: 'aria-label', ariaLabel: 'Tìm kiếm' });
    expect(resolveAccessibleName({ 'aria-labelledby': 'h1' }, null)).toEqual({ ok: true, kind: 'aria-labelledby', ariaLabelledby: 'h1' });
  });

  it.each([[{ 'aria-label': '' }], [{ 'aria-label': '   ' }], [{ label: '' }], [{ label: null }], [{ 'aria-labelledby': ' ' }], [{}]])(
    'empty or missing name %j is a configuration error',
    (props) => {
      expect(resolveAccessibleName(props, null)).toEqual({ ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' });
    },
  );

  it('nameFromField without a Field is a configuration error', () => {
    expect(resolveAccessibleName({ nameFromField: true }, null)).toEqual({ ok: false, code: 'NOVA_NAME_FROM_FIELD_OUTSIDE' });
  });

  it('nameFromField inside a Field with an empty label is a configuration error', () => {
    expect(resolveAccessibleName({ nameFromField: true }, { ...field, labelEmpty: true })).toEqual({ ok: false, code: 'NOVA_FIELD_EMPTY_LABEL' });
  });

  it('nameFromField inside a valid Field links to it', () => {
    expect(resolveAccessibleName({ nameFromField: true }, field)).toEqual({ ok: true, kind: 'field', field });
  });

  it('a Field around a standalone-named control does not take over the name', () => {
    expect(resolveAccessibleName({ 'aria-label': 'x' }, field)).toEqual({ ok: true, kind: 'aria-label', ariaLabel: 'x' });
  });
});

describe('mergeIds', () => {
  it('merges description, error and consumer ids without duplicates, in order', () => {
    expect(mergeIds('f-desc', 'f-err', 'mine f-desc  other')).toBe('f-desc f-err mine other');
  });
  it('returns undefined when nothing remains', () => {
    expect(mergeIds(undefined, '', '  ', null)).toBeUndefined();
  });
});

// elements are inspected, not trusted blindly.
import { Fragment, createElement, type ReactNode as Node } from 'react';

function Opaque() {
  return null;
}

describe('isEmptyLabel inspects elements', () => {
  it.each<[string, Node]>([
    ['empty Fragment', createElement(Fragment, null)],
    ['empty intrinsic span', createElement('span', null)],
    ['nested whitespace-only Fragments', <><>{'   '}</>{'\n'}</>],
    ['span with whitespace and empty children', <span>{' '}{null}{false}<b /></span>],
    ['aria-hidden content only', <span aria-hidden="true">*</span>],
    ['decorative image without alt', <img src="/x.png" alt="" />],
  ])('treats %s as empty', (_label, node) => {
    expect(isEmptyLabel(node)).toBe(true);
    expect(resolveAccessibleName({ label: node }, null)).toEqual({ ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' });
  });

  it.each<[string, Node]>([
    ['text inside a span', <span>Email</span>],
    ['zero inside a Fragment', <>{0}</>],
    ['image with alt text', <img src="/x.png" alt="Ảnh đại diện" />],
    ['svg with a title', <svg><title>Đóng</title></svg>],
    ['element with aria-label', <span aria-label="Tìm kiếm" />],
    ['opaque custom component (validated at integration)', <Opaque />],
    ['text next to hidden marker', <span>Tên<span aria-hidden="true">*</span></span>],
  ])('keeps %s as a name', (_label, node) => {
    expect(isEmptyLabel(node)).toBe(false);
  });
});

// hidden intrinsic subtrees are not a name.
// Each case is cross-checked against the DOM name Testing Library computes (via
// dom-accessibility-api) for an <input> labelled by the same content.
describe('isEmptyLabel skips hidden subtrees (round 2 R6)', () => {
  const domName = (node: Node) => {
    render(<><label htmlFor="r2-input">{node}</label><input id="r2-input" /></>);
    const empty = screen.queryByRole('textbox', { name: /^\s*$/u }) !== null;
    cleanup();
    return empty ? '' : 'named';
  };

  it.each<[string, Node]>([
    ['hidden attribute', <span hidden>Email</span>],
    ['display: none', <span style={{ display: 'none' }}>Email</span>],
    ['visibility: hidden', <span style={{ visibility: 'hidden' }}>Email</span>],
    ['hidden ancestor of named content', <span hidden><img src="/x.png" alt="Email" /><b aria-label="Email" /></span>],
    ['hidden Fragment child', <>{' '}<span style={{ display: 'none' }}>Email</span></>],
    // accname step 2A stops at the hidden node, so a visible descendant is not reached
    ['visible child inside a visibility: hidden parent', <span style={{ visibility: 'hidden' }}><span style={{ visibility: 'visible' }}>Email</span></span>],
  ])('treats %s as empty, matching the DOM name', (_label, node) => {
    expect(domName(node)).toBe('');
    expect(isEmptyLabel(node)).toBe(true);
    expect(resolveAccessibleName({ label: node }, null)).toEqual({ ok: false, code: 'NOVA_ACCESSIBLE_NAME_EMPTY' });
  });

  // dom-accessibility-api only treats visibility: hidden as hidden; CSS defines
  // collapse on non-table elements as hidden, so this case has no DOM oracle.
  it('treats visibility: collapse as empty', () => {
    expect(isEmptyLabel(<span style={{ visibility: 'collapse' }}>Email</span>)).toBe(true);
  });

  it.each<[string, Node]>([
    ['hidden={false}', <span hidden={false}>Email</span>],
    ['display: inline', <span style={{ display: 'inline' }}>Email</span>],
    ['visible text next to a hidden part', <span>Email<span hidden>(ẩn)</span></span>],
  ])('keeps %s as a name, matching the DOM name', (_label, node) => {
    expect(domName(node)).not.toBe('');
    expect(isEmptyLabel(node)).toBe(false);
  });

  it('keeps 0 and opaque custom components as names', () => {
    expect(isEmptyLabel(<span>{0}</span>)).toBe(false);
    expect(isEmptyLabel(<Opaque />)).toBe(false);
  });
});

import { cleanup, render, screen } from '@testing-library/react';
