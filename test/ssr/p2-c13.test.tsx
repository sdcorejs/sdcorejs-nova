import {renderToString} from 'react-dom/server';import {expect,it,vi} from 'vitest';
import {Splitter} from '../../src/components/splitter/index.js';import {ResizableDialog} from '../../src/components/resizable-dialog/index.js';
it('case-p2-c13-ac01-ssr deterministic panels and closed initial portal have no DOM or persistence access',()=>{
 expect(typeof window).toBe('undefined');expect(typeof document).toBe('undefined');const change=vi.fn();
 const render=()=>renderToString(<><Splitter defaultValue={[35,65]} minSizes={[20,20]} onValueChange={change}><p>A</p><p>B</p></Splitter><ResizableDialog title="Tools" defaultValue size={{width:400,height:300}} onSizeChange={change}>Dialog contents</ResizableDialog></>);
 const first=render();expect(first).toBe(render());expect(first).toContain('flex-basis:35%');expect(first).toContain('aria-valuenow="35"');expect(first).not.toContain('Dialog contents');expect(change).not.toHaveBeenCalled();
});
it('server rejects crafted and nonfinite percent CSS by safe numerical projection',()=>{
 const value=JSON.parse('["calc(1px)",null]') as readonly number[],change=vi.fn();const html=renderToString(<Splitter value={value} onValueChange={change}><p>A</p><p>B</p></Splitter>);expect(html).not.toMatch(/calc|NaN|Infinity/);expect(html.match(/flex-basis:50%/gu)).toHaveLength(2);expect(change).not.toHaveBeenCalled();
});

it.each(['value','minimums'] as const)('C13-A-R1 sparse %s renders dense finite SSR geometry/ARIA, preserves raw inputs and emits no proposal',kind=>{
 const sparse=Array<number>(2);if(kind==='value')sparse[1]=100;Object.freeze(sparse);const before=Object.getOwnPropertyDescriptors(sparse),change=vi.fn(),html=renderToString(<Splitter value={kind==='value'?sparse:[35,65]} minSizes={kind==='minimums'?sparse:[20,20]} onValueChange={change}><p>A</p><p>B</p></Splitter>);expect(html).not.toMatch(/NaN|Infinity|undefined%/);const sizes=[...html.matchAll(/flex-basis:([\d.]+)%/gu)].map(match=>Number(match[1]));expect(sizes).toEqual(kind==='value'?[50,50]:[35,65]);expect(sizes.reduce((sum,x)=>sum+x,0)).toBe(100);const ranges=[...html.matchAll(/aria-value(?:min|max|now)="([^"]+)"/gu)].map(match=>Number(match[1]));expect(ranges).toHaveLength(3);expect(ranges.every(Number.isFinite)).toBe(true);expect(Object.getOwnPropertyDescriptors(sparse)).toEqual(before);expect(change).not.toHaveBeenCalled();
});

import {createRef} from 'react';import {Dialog,Sheet,Drawer} from '../../src/components/dialog/index.js';
it('OVERLAY-R1 server rendering publishes no popup refs for Dialog Sheet Drawer or ResizableDialog',()=>{
 const object=createRef<HTMLDivElement>(),legacy=vi.fn(),cleanup=vi.fn<(node:HTMLDivElement|null)=>void>();const render=()=>renderToString(<><Dialog title="Server dialog" defaultValue ref={object}>D</Dialog><Sheet title="Server sheet" defaultValue ref={legacy}>S</Sheet><Drawer title="Server drawer" defaultValue ref={cleanup}>W</Drawer><ResizableDialog title="Server resize" defaultValue ref={object}>R</ResizableDialog></>);expect(render()).toBe(render());expect(render()).not.toContain('role="dialog"');expect(object.current).toBeNull();expect(legacy).not.toHaveBeenCalled();expect(cleanup).not.toHaveBeenCalled();
});