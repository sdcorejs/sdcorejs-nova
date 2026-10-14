import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem, CollapsibleSection } from '../../src/components/accordion/accordion.js';

describe('accordion server markup',()=>{
  it('closed panels do not expose children and no callbacks run during server render',()=>{
    expect(typeof document).toBe('undefined');const change=vi.fn();
    const html=renderToString(<CollapsibleSection title="Details" onValueChange={change}><input aria-label="Draft"/></CollapsibleSection>);
    expect(html).toContain('aria-expanded="false"');expect(html).not.toContain('<input');expect(change).not.toHaveBeenCalled();
    const kept=renderToString(<CollapsibleSection title="Details" keepMounted><input aria-label="Draft"/></CollapsibleSection>);
    expect(kept).toContain('hidden=""');expect(kept).toContain('inert=""');expect(kept).toContain('<input');
  });
  it('nested open panels have deterministic unique IDs and actual heading relationships',()=>{
    const content=<Accordion defaultValue={['a']}><AccordionItem value="a" title="Outer" headingLevel={2}><CollapsibleSection title="Inner" defaultValue={true} headingLevel={4}>Content</CollapsibleSection></AccordionItem></Accordion>;
    const html=renderToString(content);expect(renderToString(content)).toBe(html);expect(html).toContain('<h2');expect(html).toContain('<h4');
    const ids=[...html.matchAll(/\sid="([^"\s]+)"/gu)].map(match=>match[1]);expect(new Set(ids).size).toBe(ids.length);
    for(const match of html.matchAll(/aria-controls="([^"]+)"/gu))expect(ids).toContain(match[1]);
    for(const match of html.matchAll(/aria-labelledby="([^"]+)"/gu))expect(ids).toContain(match[1]);
    expect(html).toContain('Content');expect(html).toContain('aria-expanded="true"');
  });
});
