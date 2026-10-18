const segmenter = new Intl.Segmenter('und', {granularity:'grapheme'});
function fold(text: string): string { return text.toLowerCase().replaceAll('đ','d').normalize('NFD').replace(/\p{M}/gu,''); }

/** Original UTF-16 grapheme ranges; KMP prevents repeated-prefix backtracking. */
export function findHighlightRanges(text: string, term: string): readonly {start: number; end: number}[] {
  const needle = fold(term);
  if (!needle || !text) return [];
  const parts: string[] = [], starts: number[] = [], ends: number[] = [];
  for (const {segment,index} of segmenter.segment(text)) {
    const normalized = fold(segment); parts.push(normalized);
    for (let i=0;i<normalized.length;i++) { starts.push(index); ends.push(index+segment.length); }
  }
  const haystack = parts.join(''), prefix: number[] = Array<number>(needle.length).fill(0);
  for (let i=1, matched=0;i<needle.length;i++) {
    while (matched>0 && needle[i]!==needle[matched]) matched=prefix[matched-1]!;
    if (needle[i]===needle[matched]) matched++;
    prefix[i]=matched;
  }
  const ranges: {start:number;end:number}[] = []; let lastEnd=0;
  for (let i=0,matched=0;i<haystack.length;i++) {
    while (matched>0 && haystack[i]!==needle[matched]) matched=prefix[matched-1]!;
    if (haystack[i]===needle[matched]) matched++;
    if (matched!==needle.length) continue;
    const start=starts[i-needle.length+1]!,end=ends[i]!;
    if (start>=lastEnd) { ranges.push({start,end}); lastEnd=end; }
    matched=prefix[matched-1]!;
  }
  return ranges;
}
