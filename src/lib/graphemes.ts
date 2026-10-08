// Deterministic grapheme-aware initials (C03, INV-003): same output on server
// and client; never splits surrogate pairs, ZWJ sequences or combining marks.
const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });

export function firstGrapheme(text: string): string {
  for (const { segment } of segmenter.segment(text)) return segment;
  return '';
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '';
  const picked = words.length === 1 ? [words[0]!] : [words[0]!, words[words.length - 1]!];
  return picked.map((word) => firstGrapheme(word).normalize('NFC').toLocaleUpperCase('vi')).join('');
}
