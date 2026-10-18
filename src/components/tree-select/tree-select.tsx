'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type Ref } from 'react';
import type { ControlProps, ValueProps, Key, LoadContext, SurfaceProps } from '../../types/index.js';
import { cx } from '../../lib/cx.js';
import { Tree, type TreeSource } from '../tree/tree.js';
import { buildTree, type Branch, type TreeNode } from '../tree/tree-model.js';
import { reportPicker, pickerItems, pickerKeys, pickerStrings, PickerSurface, usePickerControl } from '../entity-picker/entity-picker.js';
export type TreeSelectProps<T, K extends Key> = ControlProps & SurfaceProps & ValueProps<readonly NoInfer<K>[]> & {
    scopeKey: string;
    tree: TreeSource<T, K>;
    getKey: (item: T) => K;
    getLabel: (item: T) => string;
    cascade?: 'loaded';
    form?: string;
    /** The outer picker container, for consumer measurement. */
    ref?: Ref<HTMLElement>;
    /** The semantic combobox trigger, for consumer focus. */
    focusRef?: Ref<HTMLElement>;
};
function dense(items: unknown): boolean {
    if (!Array.isArray(items))
        return false;
    for (let i = 0; i < items.length; i++)
        if (!Object.hasOwn(items, i))
            return false;
    return true;
}
export function TreeSelect<T, K extends Key>(props: TreeSelectProps<T, K>) {
    const { scopeKey, tree, getKey, getLabel, cascade } = props, transport = tree.mode === 'lazy' ? tree.loadChildren : undefined, owner = useMemo(() => ({ identity: [scopeKey, tree.mode, transport], branches: new Map<K, Branch<T>>(), labels: new Map<K, T>() }), [scopeKey, tree.mode, transport]);
    const [, refresh] = useReducer((n: number) => n + 1, 0), model = usePickerControl<K>(props, owner, 'TreeSelect'), [expansion, setExpansion] = useState<{
        session: object | null;
        keys: readonly K[];
    }>({ session: null, keys: [] }), latest = useRef({ getKey, tree });
    useLayoutEffect(() => { latest.current = { getKey, tree }; });
    // Observe the existing Tree transport only; Tree still owns fetch timing, aborts and validation.
    const observe = useCallback(async (item: T, context: LoadContext) => {
        const children = await transport!(item, context);
        if (!dense(children))
            throw new Error('Invalid tree children');
        if (!context.signal.aborted) {
            const checked = pickerItems<T, K>(children, latest.current.getKey);
            if (checked) {
                for (const [key, item] of checked)
                    owner.labels.set(key, item);
                owner.branches.set(latest.current.getKey(item), { status: 'ready', children, controller: new AbortController(), generation: 0 });
                refresh();
            }
        }
        return children;
    }, [owner, transport]);
    useLayoutEffect(() => {
        if (!model.open)
            owner.branches.clear();
        return () => { owner.branches.clear(); };
    }, [owner, model.open]);
    const expanded = expansion.session === model.sessionToken ? expansion.keys : [];
    const source: TreeSource<T, K> = tree.mode === 'static' ? { ...tree, getChildren: item => {
            const children = tree.getChildren(item);
            if (!dense(children))
                throw new Error('Invalid tree children');
            return children;
        } } : { ...tree, loadChildren: observe };
    // eslint-disable-next-line react-hooks/refs -- buildTree never invokes lazy transport callbacks; observe reads refs only after a transport resolves.
    const hierarchy = dense(tree.roots) ? buildTree(source, getKey, owner.branches, undefined) : { roots: [], error: 'NOVA_TREE_INVALID_SOURCE' as const }, items = new Map<K, T>(), nodes = new Map<K, TreeNode<T, K>>(), stack = [...hierarchy.roots];
    while (stack.length) {
        const node = stack.pop()!;
        items.set(node.key, node.item);
        nodes.set(node.key, node);
        stack.push(...node.children);
    }
    const text = pickerStrings(model.scope), labelOf = (key: K) => { const item = items.get(key) ?? owner.labels.get(key); return item !== undefined ? getLabel(item) : text.unresolved.replaceAll('{key}', String(key)); };
    const propose = (next: readonly K[]) => {
        if (!pickerKeys(next) || hierarchy.error)
            return;
        if (cascade !== 'loaded') {
            model.propose(next);
            return;
        }
        const changed = [...model.draft.filter(key => !next.includes(key)), ...next.filter(key => !model.draft.includes(key))];
        let result = [...next];
        for (const key of changed) {
            const node = nodes.get(key);
            if (!node)
                continue;
            const children = [...node.children], adding = next.includes(key);
            while (children.length) {
                const child = children.shift()!;
                if (adding) {
                    if (!result.includes(child.key))
                        result.push(child.key);
                }
                else
                    result = result.filter(value => value !== child.key);
                children.push(...child.children);
            }
        }
        model.propose(result);
    };
    useEffect(() => {
        if (hierarchy.error)
            reportPicker(model.scope, 'TreeSelect');
    }, [hierarchy.error, model.scope]);
    return <PickerSurface props={{ ...props, className: cx('nova-tree-select', props.className) }} model={model} labelOf={labelOf} unsafe={!!hierarchy.error || cascade !== undefined && cascade !== 'loaded'}>{hierarchy.error ? <p role="alert">{model.scope.strings.forms.configurationError}</p> : <Tree scopeKey={scopeKey} source={source} getKey={getKey} getLabel={getLabel} expandedKeys={expanded} onExpandedKeysChange={keys => setExpansion({ session: model.sessionToken, keys })} selectedKeys={model.draft} onSelectedKeysChange={propose} disabled={props.disabled} readOnly={props.readOnly}/>}</PickerSurface>;
}
