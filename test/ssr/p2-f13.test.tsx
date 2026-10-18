import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { EntityPicker } from '../../src/components/entity-picker/index.js';
import { TreeSelect } from '../../src/components/tree-select/index.js';
import { NovaProvider } from '../../src/providers/nova/index.js';
type Item = {
    id: number | string;
    name: string;
    children?: readonly Item[];
};
const key = (item: Item) => item.id, label = (item: Item) => item.name, roots: readonly Item[] = [{ id: 0, name: 'Number zero', children: [{ id: '0', name: 'String zero' }] }];
it('case-p2-f13-ac01-ssr no DOM reads, deterministic IDs, typed form keys and closed overlays', () => { expect(typeof window).toBe('undefined'); const load = vi.fn(async () => ({ items: roots, total: 1 })), hydrate = vi.fn(async () => roots); const node = <NovaProvider locale="en"><EntityPicker label="People" scopeKey="s" value={[0, '0']} onValueChange={() => { }} multiple getKey={key} getLabel={label} load={load} hydrate={hydrate} name="people"/><TreeSelect label="Places" scopeKey="s" defaultValue={[0, '0']} getKey={key} getLabel={label} tree={{ mode: 'static', roots, getChildren: item => item.children ?? [] }} name="places"/></NovaProvider>; const html = renderToString(node); expect(renderToString(node)).toBe(html); expect(html).toContain('role="combobox"'); expect(html).toContain('Number zero; String zero'); expect(html).toContain('value="n:0"'); expect(html).toContain('value="s:0"'); expect(html).not.toContain('role="dialog"'); expect(html).not.toContain('role="tree"'); expect(load).not.toHaveBeenCalled(); expect(hydrate).not.toHaveBeenCalled(); });
it('invalid arrays and readOnly names render safe SSR without accessors or reads', () => { const load = vi.fn(async () => ({ items: roots, total: 1 })); expect(renderToString(<EntityPicker label="People" scopeKey="s" defaultValue={Array(1)} getKey={key} getLabel={label} load={load}/>)).toContain('NOVA_PICKER_INVALID_CONFIGURATION'); const html = renderToString(<TreeSelect aria-label="Places" scopeKey="s" readOnly defaultValue={[0]} getKey={key} getLabel={label} tree={{ mode: 'static', roots, getChildren: item => item.children ?? [] }}/>); expect(html).toContain('aria-readonly="true"'); expect(html).toContain('aria-label="Places"'); expect(load).not.toHaveBeenCalled(); });
