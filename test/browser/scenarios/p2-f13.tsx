import { useCallback, useEffect, useRef, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { EntityPicker } from '../../../src/components/entity-picker/index.js';
import { TreeSelect } from '../../../src/components/tree-select/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';
import '../../../.sdcorejs/tmp/p2-f13/css/entity-picker.css';
import '../../../.sdcorejs/tmp/p2-f13/css/tree-select.css';
type Item = {
    id: number | string;
    label: string;
    children?: readonly Item[];
};
const zero = { id: 0, label: 'Number zero' }, stringZero = { id: '0', label: 'String zero' }, key = (item: Item) => item.id, label = (item: Item) => item.label, roots = [{ id: 0, label: 'Root', children: [{ id: '0', label: 'Child' }] }];
const tree = { mode: 'static' as const, roots, getChildren: (item: Item) => item.children ?? [] }, two = async () => ({ items: [zero, stringZero], total: 2 }), duplicate = async () => ({ items: [zero, zero], total: 2 });
export default function PickerScenario() {
    const [value, setValue] = useState<readonly (number | string)[]>(['missing']), [treeValue, setTreeValue] = useState<readonly (number | string)[]>([]), [scope, setScope] = useState('one'), [events, setEvents] = useState<string[]>([]), [count, setCount] = useState(0), [cascade, setCascade] = useState(false), [locale, setLocale] = useState<'en' | 'vi'>('en'), [refuse, setRefuse] = useState(false), pending = useRef(new Map<string, () => void>()), hydrations = useRef(0), errors = useRef(0);
    const peopleRoot = useRef<HTMLElement>(null), peopleFocus = useRef<HTMLElement>(null), placesRoot = useRef<HTMLElement>(null), placesFocus = useRef<HTMLElement>(null), [refProof, setRefProof] = useState('');
    const focusPicker = (kind: 'people' | 'places') => {
        const root = (kind === 'people' ? peopleRoot : placesRoot).current;
        const focus = (kind === 'people' ? peopleFocus : placesFocus).current;
        focus?.focus();
        setRefProof([kind, root?.tagName, focus?.tagName, focus?.getAttribute('role'), root?.contains(focus), root !== focus].join('|'));
    };
    useEffect(() => { const resolve = (event: Event) => pending.current.get((event as CustomEvent<string>).detail)?.(); window.addEventListener('picker-resolve', resolve); return () => window.removeEventListener('picker-resolve', resolve); }, []);
    const load = useCallback((request: {
        query: string;
        pageIndex: number;
        signal: AbortSignal;
    }) => {
        const { query, pageIndex, signal } = request;
        setEvents(previous => [...previous, 'load:' + query + ':' + pageIndex]);
        signal.addEventListener('abort', () => setEvents(previous => [...previous, 'abort:' + query + ':' + pageIndex]), { once: true });
        if (query === 'A' || query === 'pending')
            return new Promise<{
                items: readonly Item[];
                total: number;
            }>(resolve => pending.current.set(query, () => { setEvents(previous => [...previous, 'delivered:' + query]); resolve({ items: [{ id: 'old', label: 'Stale A' }], total: 1 }); }));
        if (query === 'B')
            return Promise.resolve({ items: [{ id: 'new', label: 'Latest B' }], total: 1 });
        if (query === 'error' && errors.current++ === 0)
            return Promise.reject(new Error('SECRET'));
        if (query)
            return Promise.resolve({ items: [], total: 0 });
        return Promise.resolve({ items: pageIndex === 0 ? [zero] : [stringZero], total: 21 });
    }, []);
    const hydrate = useCallback(async (keys: readonly (number | string)[], { signal }: {
        signal: AbortSignal;
    }) => { const index = ++hydrations.current; setEvents(previous => [...previous, 'hydrate:' + index]); signal.addEventListener('abort', () => setEvents(previous => [...previous, 'abort-hydrate:' + index]), { once: true }); return keys.flatMap(id => id === 0 ? [zero] : id === '0' ? [stringZero] : index > 1 ? [{ id, label: 'Recovered missing' }] : []); }, []);
    return <NovaProvider locale={locale}><button onClick={() => setLocale(current => current === 'en' ? 'vi' : 'en')}>Toggle locale</button><button data-testid="scope-change" onClick={() => setScope(current => current === 'one' ? 'two' : 'one')}>Change scope</button><button onClick={() => setCascade(current => !current)}>Toggle cascade</button><button onClick={() => setRefuse(current => !current)}>Toggle refusal</button><button onClick={() => focusPicker('people')}>Focus People via ref</button><button onClick={() => focusPicker('places')}>Focus Places via ref</button><output data-testid="ref-proof">{refProof}</output><EntityPicker ref={peopleRoot} focusRef={peopleFocus} label="People" scopeKey={scope} multiple value={value} onValueChange={next => {
            setCount(n => n + 1);
            if (!refuse)
                setValue(next);
        }} getKey={key} getLabel={label} load={load} hydrate={hydrate} name="people"/><EntityPicker label="Single" scopeKey="s" getKey={key} getLabel={label} load={two}/><EntityPicker label="Duplicate" scopeKey="s" getKey={key} getLabel={label} load={duplicate}/><EntityPicker label="Disabled" disabled scopeKey="s" getKey={key} getLabel={label} load={two}/><EntityPicker label="Read only" readOnly scopeKey="s" defaultValue={[0]} getKey={key} getLabel={label} load={two}/><TreeSelect ref={placesRoot} focusRef={placesFocus} label="Places" scopeKey={scope} tree={tree} getKey={key} getLabel={label} value={treeValue} onValueChange={setTreeValue} cascade={cascade ? 'loaded' : undefined}/><output data-testid="selection">{JSON.stringify(value)}</output><output data-testid="tree-selection">{JSON.stringify(treeValue)}</output><output data-testid="proposals">{count}</output><output data-testid="events">{events.join('|')}</output></NovaProvider>;
}
export function mount(container: HTMLElement) {
    function Hydrated() {
        useEffect(() => {
            if (container.dataset.hydration !== 'failed')
                container.dataset.hydration = 'complete';
        }, []);
        return <PickerScenario />;
    }
    container.dataset.hydration = 'pending';
    container.innerHTML = renderToString(<Hydrated />);
    hydrateRoot(container, <Hydrated />, { onRecoverableError: () => { container.dataset.hydration = 'failed'; } });
}
