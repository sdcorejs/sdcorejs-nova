import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AnchorNavigation, AnchorSection } from '../../src/components/anchor-navigation/anchor-navigation.js';
describe('anchor navigation server contracts',()=>{
 it('renders deterministic native hrefs and named focusable headings without browser or observer work',()=>{
  expect(typeof document).toBe('undefined');const change=vi.fn();const tree=<><AnchorNavigation items={[{id:'one',title:'One'}]} label="Contents" defaultActiveId="one" onActiveIdChange={change}/><AnchorSection id="one" title="First">Body</AnchorSection></>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);expect(html).toContain('href="#one"');expect(html).toContain('aria-current="location"');expect(html).toContain('tabindex="-1"');const headingId=html.match(/<h2[^>]*id="([^"]+)"/)?.[1];expect(headingId).toBeTruthy();expect(html).toContain(`aria-labelledby="${headingId}"`);expect(change).not.toHaveBeenCalled();
 });
 it('encodes civil DOM fragment identifiers while preserving actual section identity and heading level',()=>{
  const html=renderToString(<><AnchorNavigation label="Contents" items={[{id:'details space',title:'Details'}]}/><AnchorSection id="details space" title="Details heading" headingLevel={3}>Body</AnchorSection></>);expect(html).toContain('href="#details%20space"');expect(html).toContain('id="details space"');expect(html).toContain('<h3');
 });
 it('empty navigation remains named and does not invent a section or selected item',()=>{
  const html=renderToString(<AnchorNavigation label="Contents" items={[]} offsetPx={NaN}/>);expect(html).toContain('aria-label="Contents"');expect(html).not.toContain('<a');expect(html).not.toContain('aria-current');
 });
 it('duplicate IDs render a safe configuration message rather than ambiguous native links',()=>{
  const html=renderToString(<AnchorNavigation label="Contents" items={[{id:'same',title:'A'},{id:'same',title:'B'}]}/>);expect(html).toContain('data-nova-config-error="NOVA_ANCHOR_DUPLICATE_ID"');expect(html).not.toContain('<a');
 });
});
