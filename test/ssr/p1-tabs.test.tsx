import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, TabList, Tab, TabPanel } from '../../src/components/tabs/tabs.js';
describe('tabs server contracts',()=>{
  it('uses stable reciprocal IDs and deterministic known-compound fallback without a callback',()=>{
    expect(typeof document).toBe('undefined');const change=vi.fn();const tree=<Tabs value="missing" onValueChange={change}><TabList label="Views"><Tab value="disabled" disabled>Disabled</Tab><Tab value="one">One</Tab></TabList><TabPanel value="one">First</TabPanel></Tabs>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);const selected=html.match(/<button[^>]*aria-selected="true"[^>]*>/)?.[0];expect(selected).toBeTruthy();const id=selected!.match(/ id="([^"]+)"/)![1],panel=selected!.match(/aria-controls="([^"]+)"/)![1];expect(html).toContain(`id="${panel}"`);expect(html).toContain(`aria-labelledby="${id}"`);expect(html).toContain('First');expect(change).not.toHaveBeenCalled();
  });
  it('kept inactive panels are hidden and inert in initial server markup while default inactive panels are omitted',()=>{
    const html=renderToString(<Tabs defaultValue="one"><TabList label="Views"><Tab value="one">One</Tab><Tab value="two">Two</Tab><Tab value="three">Three</Tab></TabList><TabPanel value="one">Active</TabPanel><TabPanel value="two" keepMounted><input aria-label="Saved draft"/></TabPanel><TabPanel value="three">Unmounted body</TabPanel></Tabs>);const panel=html.match(/<div[^>]*-panel-two[^>]*>/)?.[0];expect(panel).toContain('hidden=""');expect(panel).toContain('inert=""');expect(html).toContain('Saved draft');expect(html).not.toContain('Unmounted body');
  });
  it('nested roots do not contribute their tabs to the enclosing server fallback',()=>{
    const tree=<Tabs><Tabs><TabList label="Inner"><Tab value="inner">Inner</Tab></TabList><TabPanel value="inner">Inner body</TabPanel></Tabs><TabList label="Outer"><Tab value="outer">Outer</Tab></TabList><TabPanel value="outer">Outer body</TabPanel></Tabs>;const html=renderToString(tree);expect(html).toContain('Inner body');expect(html).toContain('Outer body');expect((html.match(/aria-selected="true"/g) ?? [])).toHaveLength(2);expect(renderToString(tree)).toBe(html);
  });
  it('opaque nested owners never seed the enclosing server fallback',()=>{
    function Nested({children}:{children:ReactNode}){return <Tabs>{children}</Tabs>;}
    const tree=<Tabs><Nested><TabList label="Inner"><Tab value="inner">Inner</Tab></TabList><TabPanel value="inner">Inner body</TabPanel></Nested><TabList label="Outer"><Tab value="outer">Outer</Tab></TabList><TabPanel value="outer">Outer body</TabPanel></Tabs>;const html=renderToString(tree);expect(html).toContain('Inner body');expect(html).toContain('Outer body');expect((html.match(/aria-selected="true"/g) ?? [])).toHaveLength(2);expect(renderToString(tree)).toBe(html);
  });
  it('opaque compound wrappers with an explicit valid initial value do not require server traversal',()=>{
    function Wrapper({children}:{children:ReactNode}){return <section>{children}</section>;}
    const tree=<Tabs defaultValue="one"><Wrapper><TabList label="Views"><Tab value="one">One</Tab></TabList><TabPanel value="one">Body</TabPanel></Wrapper></Tabs>;const html=renderToString(tree);expect(html).toContain('Body');expect(html).toContain('aria-selected="true"');expect(renderToString(tree)).toBe(html);
  });
  it.each(['controlled','uncontrolled'] as const)('opaque compounds preserve an explicit empty-string %s initial value',mode=>{
    function Choices(){return <TabList label="Views"><Tab value="">Empty key</Tab></TabList>;}
    const children=<><Choices/><TabPanel value="">Empty key body</TabPanel></>;const tree=mode==='controlled'?<Tabs value="" onValueChange={()=>{}}>{children}</Tabs>:<Tabs defaultValue="">{children}</Tabs>;const html=renderToString(tree);expect(html).toContain('Empty key body');expect(html).toContain('aria-selected="true"');expect(renderToString(tree)).toBe(html);
  });
  it('opaque consumer parts with an explicit valid value remain deterministic and two roots own distinct identities',()=>{
    function Choices(){return <TabList label="Views"><Tab value="one">One</Tab></TabList>;}
    const tree=<><Tabs defaultValue="one"><Choices/><TabPanel value="one">First request</TabPanel></Tabs><Tabs defaultValue="one"><Choices/><TabPanel value="one">Second request</TabPanel></Tabs></>;const html=renderToString(tree);expect(renderToString(tree)).toBe(html);const ids=[...html.matchAll(/ id="([^"]+-tab-one)"/g)].map(match=>match[1]);expect(ids).toHaveLength(2);expect(new Set(ids).size).toBe(2);expect(html).toContain('First request');expect(html).toContain('Second request');
  });
});
