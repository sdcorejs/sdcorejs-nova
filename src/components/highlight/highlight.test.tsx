import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { findHighlightRanges } from '../../lib/highlight-ranges.js';
import { Highlight } from './highlight.js';

afterEach(cleanup);

describe('plain text highlighting preserves original graphemes', () => {
  it('hostile markup remains literal text even when its attributes match the query', () => {
    const value='<img src=x onerror=alert(1)>',view=render(<Highlight text={value} term="onerror"/>);
    expect(view.container.textContent).toBe(value);expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('mark')?.textContent).toBe('onerror');
  });
  it('folds Vietnamese accents and Đ while mapping ranges onto the untouched source', () => {
    const text='Nguyễn Đặng';
    expect(findHighlightRanges(text,'NGUYEN')).toEqual([{start:0,end:6}]);
    expect(findHighlightRanges(text,'dang')).toEqual([{start:7,end:11}]);
    const view=render(<Highlight text={text} term="nguyen"/>);
    expect(view.container.textContent).toBe(text);expect(view.container.querySelector('mark')?.textContent).toBe('Nguyễn');
  });
  it('never cuts a combining accent or a joined emoji family', () => {
    const family='👨‍👩‍👧‍👦',text='x '+family+' e\u0301';
    expect(findHighlightRanges(text,'👩')).toEqual([{start:2,end:2+family.length}]);
    expect(findHighlightRanges('e\u0301','É')).toEqual([{start:0,end:2}]);
  });
  it('matches are ordered and nonoverlapping; empty text or term has no marks', () => {
    expect(findHighlightRanges('aaaaa','aa')).toEqual([{start:0,end:2},{start:2,end:4}]);
    expect(findHighlightRanges('anything','')).toEqual([]);expect(findHighlightRanges('','term')).toEqual([]);
  });
  it('zero is visible and nullish content does not emit accidental placeholder strings', () => {
    const zero=render(<Highlight text={0} term="0"/>);expect(zero.container.querySelector('mark')?.textContent).toBe('0');
    const missing=render(<Highlight text={null} term="null"/>);expect(missing.container.textContent).toBe('');
  });
  it('handles a long repeated prefix and query punctuation as literal characters', () => {
    const text='a'.repeat(30000)+'b',term='a'.repeat(1000)+'b';
    expect(findHighlightRanges(text,term)).toEqual([{start:29000,end:30001}]);
    expect(findHighlightRanges('a.*b','.*')).toEqual([{start:1,end:3}]);
  });
});
