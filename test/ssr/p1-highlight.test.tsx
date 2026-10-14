import { renderToString } from 'react-dom/server';
import { describe,expect,it } from 'vitest';
import { Highlight } from '../../src/components/highlight/highlight.js';

describe('highlight server text safety',()=>{
  it('untrusted HTML stays escaped plain text alongside semantic marks',()=>{const html=renderToString(<Highlight text="<img onerror=alert(1)>" term="onerror"/>);expect(html).not.toContain('<img');expect(html).toContain('&lt;img');expect(html).toContain('<mark>onerror</mark>');});
  it('Vietnamese original text and zero survive SSR without DOM globals',()=>{expect(typeof document).toBe('undefined');expect(renderToString(<Highlight text="Nguyễn" term="NGUYEN"/>)).toContain('<mark>Nguyễn</mark>');expect(renderToString(<Highlight text={0} term="0"/>)).toContain('<mark>0</mark>');});
});
