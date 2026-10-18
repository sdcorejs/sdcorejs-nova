import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { Tree } from '../../src/components/tree/index.js';
it('case-p2-d04-ac01-ssr imports and renders without DOM or lazy reads, with deterministic ARIA', () => {
  expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined'); const load=vi.fn(async()=>[]); const node={id:0,label:'Zero'};
  const element=<Tree aria-label="Files" scopeKey="ssr" source={{mode:'lazy',roots:[node],hasChildren:()=>true,loadChildren:load}} getKey={n=>n.id} getLabel={n=>n.label} expandedKeys={[0]} onExpandedKeysChange={()=>{}}/>;
  const html=renderToString(element); expect(html).toBe(renderToString(element)); expect(html).toContain('role="tree"'); expect(html).toContain('role="treeitem"'); expect(html).toContain('aria-level="1"'); expect(html).toContain('Zero'); expect(load).not.toHaveBeenCalled();
});
it('case-p2-d04-ac01-ssr static empty tree retains accessible name and status', () => {
  const html=renderToString(<Tree<number,number> aria-label="Empty files" scopeKey="ssr" source={{mode:'static',roots:[],getChildren:()=>[]}} getKey={n=>n} getLabel={String} expandedKeys={[]} onExpandedKeysChange={()=>{}}/>); expect(html).toContain('aria-label="Empty files"'); expect(html).toContain('role="status"');
});
