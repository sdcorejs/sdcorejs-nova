import { describe, expect, it } from 'vitest';

import { buildRadioKeyMap, defaultSerializeKey, findOptionIndex } from './radio-key.js';

describe('radio key codec (INV-015)', () => {
  it('encodes numbers and strings without collision', () => {
    expect(defaultSerializeKey(1)).toBe('n:1');
    expect(defaultSerializeKey('1')).toBe('s:1');
    expect(defaultSerializeKey('n:1')).toBe('s:n:1');
    expect(defaultSerializeKey(0)).toBe('n:0');
    expect(defaultSerializeKey(-2.5)).toBe('n:-2.5');
    expect(defaultSerializeKey('')).toBe('s:');
  });

  it('maps mixed numeric/string options to distinct serialized values', () => {
    const result = buildRadioKeyMap([{ value: 1 }, { value: '1' }, { value: 0 }]);
    expect(result).toEqual({ ok: true, serialized: ['n:1', 's:1', 'n:0'] });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('rejects non-finite key %s', (key) => {
    expect(buildRadioKeyMap([{ value: 'a' }, { value: key }])).toEqual({ ok: false, code: 'NOVA_RADIO_NONFINITE_KEY', index: 1 });
  });

  it('rejects duplicate serialized values deterministically by option order', () => {
    expect(buildRadioKeyMap([{ value: 'a' }, { value: 'b' }, { value: 'a' }])).toEqual({ ok: false, code: 'NOVA_RADIO_DUPLICATE_KEY', index: 2 });
    expect(buildRadioKeyMap([{ value: 0 }, { value: -0 }])).toEqual({ ok: false, code: 'NOVA_RADIO_DUPLICATE_KEY', index: 1 });
    const lower = (key: string) => key.toLowerCase();
    expect(buildRadioKeyMap([{ value: 'A' }, { value: 'a' }], lower)).toEqual({ ok: false, code: 'NOVA_RADIO_DUPLICATE_KEY', index: 1 });
    expect(buildRadioKeyMap([{ value: Number.NaN }, { value: 'x' }, { value: 'x' }])).toEqual({ ok: false, code: 'NOVA_RADIO_NONFINITE_KEY', index: 0 });
  });

  it('uses the custom serializer output', () => {
    expect(buildRadioKeyMap([{ value: 'email' }, { value: 'sms' }], (key) => key.toUpperCase()))
      .toEqual({ ok: true, serialized: ['EMAIL', 'SMS'] });
  });

  it('empty options are valid and map to nothing', () => {
    expect(buildRadioKeyMap([])).toEqual({ ok: true, serialized: [] });
  });

  it('finds the selected option with === only', () => {
    const options = [{ value: 1 }, { value: '1' }, { value: 0 }] as const;
    expect(findOptionIndex(options, 1)).toBe(0);
    expect(findOptionIndex(options, '1')).toBe(1);
    expect(findOptionIndex(options, 0)).toBe(2);
    expect(findOptionIndex(options, null)).toBe(-1);
    expect(findOptionIndex(options, '0')).toBe(-1);
  });
});
