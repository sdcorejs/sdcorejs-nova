'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode, type Ref } from 'react';
import type { ControlProps, ValueProps, Key, LoadContext, SurfaceProps } from '../../types/index.js';
import type { NovaScope } from '../../providers/nova/context.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { defaultSerializeKey } from '../../lib/radio-key.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useNativeFormReset } from '../../lib/p1-async-lifecycle.js';
import { FieldControlError, useFieldControl } from '../field/field.js';
import { Sheet } from '../dialog/dialog.js';
import { Button } from '../button/button.js';
import { DataTable } from '../data-table/data-table.js';
export type EntityPickerProps<T, K extends Key> = ControlProps & SurfaceProps & ValueProps<readonly NoInfer<K>[]> & {
    scopeKey: string;
    getKey: (item: T) => K;
    getLabel: (item: T) => string;
    load: (request: {
        query: string;
        pageIndex: number;
        pageSize: number;
        signal: AbortSignal;
    }) => Promise<{
        items: readonly T[];
        total: number;
    }>;
    hydrate?: (keys: readonly K[], context: LoadContext) => Promise<readonly T[]>;
    multiple?: boolean;
    form?: string;
    /** The outer picker container, for consumer measurement. */
    ref?: Ref<HTMLElement>;
    /** The semantic combobox trigger, for consumer focus. */
    focusRef?: Ref<HTMLElement>;
};
type PickerControlProps<K extends Key> = ControlProps & SurfaceProps & ValueProps<readonly K[]> & {
    scopeKey: string;
    form?: string;
    ref?: Ref<HTMLElement>;
    focusRef?: Ref<HTMLElement>;
};
const EMPTY: readonly never[] = [];
/** Private to F13: indexed validation rejects holes before callbacks. */
export function pickerKeys<K extends Key>(value: unknown): K[] | null {
    if (!Array.isArray(value))
        return null;
    const seen = new Set<Key>(), keys: K[] = [];
    for (let i = 0; i < value.length; i++) {
        if (!Object.hasOwn(value, i))
            return null;
        const key: unknown = value[i];
        if (typeof key !== 'string' && (typeof key !== 'number' || !Number.isFinite(key)) || seen.has(key as Key))
            return null;
        seen.add(key as Key);
        keys.push(key as K);
    }
    return keys;
}
export function pickerItems<T, K extends Key>(items: unknown, getKey: (item: T) => K): Map<K, T> | null {
    if (!Array.isArray(items))
        return null;
    const result = new Map<K, T>();
    try {
        for (let i = 0; i < items.length; i++) {
            if (!Object.hasOwn(items, i))
                return null;
            const item = items[i] as T, key = getKey(item);
            if (!pickerKeys([key]) || result.has(key))
                return null;
            result.set(key, item);
        }
    }
    catch {
        return null;
    }
    return result;
}
export const samePickerKeys = (a: readonly Key[], b: readonly Key[]) => a.length === b.length && a.every((key, i) => key === b[i]);
const en = { empty: 'No selection', apply: 'Apply', cancel: 'Cancel', search: 'Search', results: 'Results', name: 'Name', none: 'No results', error: 'Unable to load results', retry: 'Retry results', unresolved: 'Unresolved: {key}', retrySelection: 'Retry selection', selectionError: 'Unable to resolve selection', summary: 'Selected items' };
const vi = { empty: 'Chưa chọn mục nào', apply: 'Áp dụng', cancel: 'Hủy', search: 'Tìm kiếm', results: 'Kết quả', name: 'Tên', none: 'Không có kết quả', error: 'Không thể tải kết quả', retry: 'Thử tải lại kết quả', unresolved: 'Chưa tìm thấy: {key}', retrySelection: 'Thử tải lại lựa chọn', selectionError: 'Không thể tải lựa chọn', summary: 'Các mục đã chọn' };
export function pickerStrings(scope: NovaScope) { const fallback = scope.locale.toLowerCase().startsWith('vi') ? vi : en, forms = scope.strings.forms as typeof scope.strings.forms & Partial<Record<`picker${Capitalize<keyof typeof en>}`, string>>; return Object.fromEntries(Object.entries(fallback).map(([key, value]) => [key, forms[`picker${key[0]!.toUpperCase()}${key.slice(1)}` as `picker${Capitalize<keyof typeof en>}`] ?? value])) as typeof en; }
declare const process: {
    env: {
        NODE_ENV?: string;
    };
};
export function reportPicker(scope: NovaScope, component: string) {
    try {
        if (process.env.NODE_ENV === 'production')
            return;
    }
    catch { /* Browser hosts may omit process. */ }
    const code = 'NOVA_PICKER_INVALID_CONFIGURATION', id = code + '|' + component;
    if (scope.diagnostics.seen.has(id))
        return;
    scope.diagnostics.seen.add(id);
    console.warn('[nova] ' + code + ' <' + component + '>: picker requires valid unique typed keys and configuration');
}
/** One owner for accepted values and per-open drafts. Controlled callbacks remain proposals. */
export function usePickerControl<K extends Key>(props: PickerControlProps<K>, identity: object, component: string, multiple = true) {
    const scope = useNovaScope(), report = useDiagnostics(component), control = useFieldControl(props, { component }), [current, setCurrent, resetValue] = useControllableValue<readonly K[]>({ ...props, fallback: EMPTY, report });
    const [initial] = useState(() => pickerKeys<K>(props.defaultValue ?? EMPTY)), [controlled] = useState(props.value !== undefined);
    const selected = pickerKeys<K>(current), valid = !!selected && (multiple || selected.length <= 1) && typeof props.scopeKey === 'string';
    const [session, setSession] = useState<{
        identity: object;
        token: object;
        draft: readonly K[];
    } | null>(null), [input, setInput] = useState<HTMLInputElement | null>(null);
    const open = !!session && session.identity === identity && !props.disabled && !props.readOnly && valid;
    if (session && (session.identity !== identity || props.disabled || props.readOnly || !valid))
        setSession(null);
    useEffect(() => {
        if (!valid)
            reportPicker(scope, component);
    }, [valid, scope, component]);
    useNativeFormReset(input, props.form, () => {
        if (!controlled && initial && selected && !samePickerKeys(initial, selected)) {
            resetValue(initial);
            props.onValueChange?.([...initial]);
        }
        setSession(null);
    });
    return { scope, control, selected: selected ?? EMPTY, valid, open, sessionToken: session?.token ?? null, setInput, draft: open ? session!.draft : selected ?? EMPTY, begin: () => {
            if (valid && !props.disabled && !props.readOnly)
                setSession({ identity, token: {}, draft: [...selected!] });
        }, cancel: () => setSession(null), propose: (next: readonly K[]) => {
            const keys = pickerKeys<K>(next);
            if (open && keys && (multiple || keys.length <= 1))
                setSession({ identity, token: session!.token, draft: keys });
        }, apply: () => {
            if (!open)
                return;
            const next = session!.draft;
            if (!samePickerKeys(selected!, next))
                setCurrent([...next]);
            setSession(null);
        } };
}
/** Preserve React 19 callback cleanup; older callback forms receive null on detach. */
function attachPickerRef<T>(ref: Ref<T> | undefined, node: T): (() => void) | undefined {
    if (typeof ref === 'function') {
        const cleanup = ref(node);
        return typeof cleanup === 'function' ? cleanup : () => ref(null);
    }
    if (ref) {
        ref.current = node;
        return () => { ref.current = null; };
    }
    return undefined;
}
/** Shared visual shell uses Sheet's proven modal focus/portal owner on all widths. */
export function PickerSurface<K extends Key>({ props, model, labelOf, children, unsafe = false, extra }: {
    props: PickerControlProps<K>;
    model: ReturnType<typeof usePickerControl<K>>;
    labelOf: (key: K) => string;
    children: ReactNode;
    unsafe?: boolean;
    extra?: ReactNode;
}) {
    const { control, scope } = model, text = pickerStrings(scope), trigger = useRef<HTMLButtonElement>(null);
    const connectRoot = useCallback((node: HTMLDivElement | null) => {
        if (node) return attachPickerRef<HTMLElement>(props.ref, node);
    }, [props.ref]);
    const connectTrigger = useCallback((node: HTMLButtonElement | null) => {
        trigger.current = node;
        if (!node) return;
        const cleanup = attachPickerRef<HTMLElement>(props.focusRef, node);
        return () => { trigger.current = null; cleanup?.(); };
    }, [props.focusRef]);
    const [popupId, setPopupId] = useState<string>();
    // Sheet owns the popup ID. Link to its actual committed dialog when content mounts.
    const summary = useCallback((node: HTMLDivElement | null) => {
        const popup = node?.closest<HTMLElement>('[role="dialog"]');
        setPopupId(popup?.id || undefined);
    }, []);
    if (!control.ok)
        return <FieldControlError component="Picker" code={control.code}/>;
    if (!model.valid)
        return control.wrap(<span data-nova-config-error="NOVA_PICKER_INVALID_CONFIGURATION">{scope.strings.forms.configurationError}</span>); /* eslint-disable react-hooks/refs -- The field wrapper forwards JSX refs; only the invalid-event handler reads .current. */
    return control.wrap(<div ref={connectRoot} className={cx('nova-entity-picker', props.className)} style={props.style} data-testid={props['data-testid']} data-disabled={props.disabled || undefined}><button type="button" role="combobox" aria-controls={model.open ? popupId : undefined} id={control.id} ref={connectTrigger} className="nova-entity-picker__trigger" disabled={props.disabled} aria-disabled={props.disabled || undefined} aria-readonly={props.readOnly || undefined} aria-haspopup="dialog" aria-expanded={model.open} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby ?? control.labelId} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid || undefined} aria-required={control.required || undefined} onFocus={props.onFocus} onBlur={props.onBlur} title={props.title} onClick={model.begin}><span className={model.selected.length ? 'nova-entity-picker__value' : 'nova-entity-picker__value nova-entity-picker__placeholder'}>{model.selected.length ? model.selected.map(labelOf).join('; ') : text.empty}</span><Icon name="chevron-down" className="nova-entity-picker__chevron"/></button><input className="nova-entity-picker__validity" type="text" aria-hidden="true" tabIndex={-1} ref={model.setInput} form={props.form} required={control.required} disabled={props.disabled || props.readOnly} value={model.selected.length ? "selected" : ""} onChange={() => { }} onInvalid={event => { event.preventDefault(); trigger.current?.focus(); }}/>{props.name !== undefined ? model.selected.map(key => <input type="hidden" key={defaultSerializeKey(key)} name={props.name} form={props.form} value={defaultSerializeKey(key)} disabled={props.disabled}/>) : null}{extra}{model.open ? <Sheet value={model.open} onValueChange={next => {
                if (!next)
                    model.cancel();
            }} title={props.label ?? <span aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby}>{text.summary}</span>} side="bottom" size="lg" className="nova-entity-picker__dialog" returnFocusRef={trigger}><div ref={summary} role="group" aria-label={text.summary} className="nova-entity-picker__summary">{model.draft.length ? model.draft.map(labelOf).join('; ') : text.empty}</div>{children}<div className="nova-entity-picker__actions"><Button variant="secondary" onClick={model.cancel}>{text.cancel}</Button><Button disabled={unsafe || props.disabled || props.readOnly} onClick={model.apply}>{text.apply}</Button></div></Sheet> : null}</div>);
}
/* eslint-enable react-hooks/refs */
function createPickerOwner<T, K extends Key>(identity: readonly unknown[]) {
    let active = false;
    const cache = new Map<K, T>(), controllers = new Set<AbortController>();
    return { identity, cache, controllers, isActive: () => active, activate: () => { active = true; }, dispose: () => {
            active = false;
            for (const controller of controllers)
                controller.abort();
            controllers.clear();
            cache.clear();
        } };
}
const PAGE_SIZE = 20;
type Page<T> = {
    identity: object;
    query: string;
    pageIndex: number;
    items: readonly T[];
    total: number;
    status: 'loading' | 'ready' | 'error';
};
export function EntityPicker<T, K extends Key>(props: EntityPickerProps<T, K>) {
    const { scopeKey, load, hydrate, getKey, getLabel, disabled, multiple = false } = props;
    // Either transport change invalidates both channels. Accessors are presentation inputs.
    const owner = useMemo(() => createPickerOwner<T, K>([scopeKey, load, hydrate]), [scopeKey, load, hydrate]);
    const model = usePickerControl<K>(props, owner, 'EntityPicker', multiple), text = pickerStrings(model.scope), searchInput = useRef<HTMLInputElement>(null), latest = useRef({ getKey, getLabel });
    useLayoutEffect(() => { latest.current = { getKey, getLabel }; });
    const [search, setSearch] = useState({ query: '', pageIndex: 0 }), [page, setPage] = useState<Page<T> | null>(null), [retry, setRetry] = useState(0), [hydrateRetry, setHydrateRetry] = useState(0), [hydration, setHydration] = useState<{
        owner: object;
        signature: string;
        status: 'loading' | 'ready' | 'error';
    } | null>(null), [, refresh] = useReducer((n: number) => n + 1, 0);
    useLayoutEffect(() => { owner.activate(); return () => owner.dispose(); }, [owner]);
    const selectedSignature = JSON.stringify(model.selected.map(defaultSerializeKey));
    /* eslint-disable react-hooks/set-state-in-effect -- Publish request loading state while starting external transports; their completions are asynchronous. */
    useEffect(() => {
        if (!hydrate || !model.valid || disabled || !model.selected.length)
            return;
        const keys = [...model.selected], controller = new AbortController();
        owner.controllers.add(controller);
        let active = true;
        setHydration({ owner, signature: selectedSignature, status: 'loading' });
        const current = () => active && owner.isActive() && !controller.signal.aborted;
        let work: Promise<readonly T[]>;
        try {
            work = hydrate(keys, { signal: controller.signal });
        }
        catch {
            work = Promise.reject();
        }
        void Promise.resolve(work).then(items => {
            if (!current())
                return;
            const resolved = pickerItems<T, K>(items, latest.current.getKey);
            if (!resolved || [...resolved.keys()].some(key => !keys.includes(key))) {
                setHydration({ owner, signature: selectedSignature, status: 'error' });
                return;
            }
            for (const [key, item] of resolved)
                owner.cache.set(key, item);
            setHydration({ owner, signature: selectedSignature, status: 'ready' });
            refresh();
        }, () => {
            if (current())
                setHydration({ owner, signature: selectedSignature, status: 'error' });
        });
        return () => { active = false; controller.abort(); owner.controllers.delete(controller); };
        // The signature preserves key type/order; fresh arrays and accessors do not own reads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owner, hydrate, selectedSignature, hydrateRetry, model.valid, disabled]);
    useEffect(() => {
        if (!model.open || disabled || !model.valid)
            return;
        const { query, pageIndex } = search, controller = new AbortController();
        owner.controllers.add(controller);
        let active = true;
        setPage({ identity: owner, query, pageIndex, items: [], total: 0, status: 'loading' });
        const current = () => active && owner.isActive() && !controller.signal.aborted;
        let work: ReturnType<typeof load>;
        try {
            work = load({ query, pageIndex, pageSize: PAGE_SIZE, signal: controller.signal });
        }
        catch {
            work = Promise.reject();
        }
        void Promise.resolve(work).then(result => {
            if (!current())
                return;
            const items = result && pickerItems<T, K>(result.items, latest.current.getKey);
            if (!items || !Number.isSafeInteger(result.total) || result.total < 0) {
                setPage({ identity: owner, query, pageIndex, items: [], total: 0, status: 'error' });
                return;
            }
            for (const [key, item] of items)
                owner.cache.set(key, item);
            setPage({ identity: owner, query, pageIndex, items: [...items.values()], total: result.total, status: 'ready' });
            refresh();
        }, () => {
            if (current())
                setPage({ identity: owner, query, pageIndex, items: [], total: 0, status: 'error' });
        });
        return () => { active = false; controller.abort(); owner.controllers.delete(controller); };
    }, [model.open, model.valid, owner, load, search, retry, disabled]);
    /* eslint-enable react-hooks/set-state-in-effect */
    const currentHydration = hydration?.owner === owner && hydration.signature === selectedSignature ? hydration : null;
    const currentPage = page?.identity === owner && page.query === search.query && page.pageIndex === search.pageIndex ? page : null, rows = currentPage?.items ?? EMPTY, status = currentPage?.status ?? 'loading';
    const labelOf = (key: K) => { const item = owner.cache.get(key); return item !== undefined ? getLabel(item) : text.unresolved.replaceAll('{key}', String(key)); }, unresolved = model.selected.some(key => !owner.cache.has(key));
    return <PickerSurface props={props} model={model} labelOf={labelOf} extra={<>{currentHydration?.status === 'error' ? <p role="alert">{text.selectionError}</p> : null}{(unresolved || currentHydration?.status === 'error') && hydrate && model.selected.length ? <Button variant="secondary" disabled={disabled || currentHydration?.status === 'loading'} onClick={event => { event.currentTarget.closest('.nova-entity-picker')?.querySelector<HTMLElement>('[role="combobox"]')?.focus(); setHydrateRetry(n => n + 1); }}>{text.retrySelection}</Button> : null}</>}><label className="nova-entity-picker__search">{text.search}<input ref={searchInput} type="search" aria-label={text.search} value={search.query} onChange={event => setSearch({ query: event.target.value, pageIndex: 0 })}/></label>{status === 'error' ? <div><p role="alert">{text.error}</p><Button variant="secondary" onClick={() => { searchInput.current?.focus(); setRetry(n => n + 1); }}>{text.retry}</Button></div> : <><DataTable caption={text.results} rows={rows} getRowKey={getKey} columns={[{ id: 'label', header: text.name, cell: getLabel }]} state={{ page: { pageIndex: search.pageIndex, pageSize: PAGE_SIZE }, sort: [], selectedKeys: model.draft }} onStateChange={next => {
                if (next.page.pageIndex !== search.pageIndex)
                    setSearch(previous => ({ ...previous, pageIndex: next.page.pageIndex }));
                else
                    model.propose(next.selectedKeys);
            }} total={currentPage?.total ?? 0} loading={status === 'loading'} isRowSelectable={row => multiple || !model.draft.length || model.draft.includes(getKey(row))}/>{status === 'ready' && !rows.length ? <p role="status">{text.none}</p> : null}</>}</PickerSurface>;
}
