import { describe, expect, it } from 'vitest';

import { firstGrapheme, initials } from './graphemes.js';

describe('graphemes', () => {
  it('takes first graphemes of first and last words', () => {
    expect(initials('Nguyễn An')).toBe('NA');
    expect(initials('Nguyễn Văn An')).toBe('NA');
    expect(initials('an')).toBe('A');
    expect(initials('  đặng   ánh  ')).toBe('ĐÁ');
  });

  it('keeps ZWJ emoji sequences whole', () => {
    const family = '👨‍👩‍👧';
    expect(firstGrapheme(`${family} Family`)).toBe(family);
    expect(initials(`${family} Family`)).toBe(`${family}F`);
    expect(initials('🇻🇳 Việt')).toBe('🇻🇳V');
  });

  it('keeps Vietnamese combining marks with their base letter (NFC result)', () => {
    const decomposed = 'Élise Ấn';
    expect(firstGrapheme(decomposed)).toBe('É');
    expect(initials(decomposed)).toBe('ÉẤ');
    expect(initials('Ảnh')).toBe('Ả');
  });

  it('empty or whitespace names have no initials', () => {
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
    expect(firstGrapheme('')).toBe('');
  });
});
