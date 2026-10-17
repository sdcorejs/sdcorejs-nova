import {createRef,type Ref} from 'react';
// case-p2-f13-ac01-types: public package fixture. Packed resolution is owned by TASK030.
import { EntityPicker as RootEntityPicker, TreeSelect as RootTreeSelect } from '@sdcorejs/nova';
import { EntityPicker, type EntityPickerProps } from '@sdcorejs/nova/entity-picker';
import { TreeSelect, type TreeSelectProps } from '@sdcorejs/nova/tree-select';
type Item = {
    id: 0 | '0';
    name: string;
    children?: readonly Item[];
};
const roots: readonly Item[] = [{ id: 0, name: 'Zero' }], key = (item: Item) => item.id, label = (item: Item) => item.name, load = async () => ({ items: roots, total: 1 });
const entity: EntityPickerProps<Item, 0 | '0'> = { label: 'People', scopeKey: 's', getKey: key, getLabel: label, load, multiple: true, value: [0, '0'], onValueChange: next => { const typed: readonly (0 | '0')[] = next; void typed; } };
const tree: TreeSelectProps<Item, 0 | '0'> = { label: 'Places', scopeKey: 's', getKey: key, getLabel: label, tree: { mode: 'static', roots, getChildren: item => item.children ?? [] }, cascade: 'loaded', defaultValue: [0] };
export const fixtures = <><RootEntityPicker {...entity}/><EntityPicker {...entity}/><RootTreeSelect {...tree}/><TreeSelect {...tree}/><EntityPicker nameFromField scopeKey="s" getKey={key} getLabel={label} load={load}/></>;
// @ts-expect-error AccessibleName is required.
export const missingName = <EntityPicker scopeKey="s" getKey={key} getLabel={label} load={load}/>;
// @ts-expect-error Controlled mode requires onValueChange.
export const missingCallback = <EntityPicker label="People" scopeKey="s" value={[0]} getKey={key} getLabel={label} load={load}/>;
// @ts-expect-error Mutually exclusive modes.
export const mixedMode = <EntityPicker {...entity} defaultValue={[0]}/>;
// @ts-expect-error Value keys remain the actual getKey result type.
export const wrongKey = <EntityPicker label="People" scopeKey="s" getKey={key} getLabel={label} load={load} defaultValue={['other']}/>;
// @ts-expect-error No default implicit or deep cascade.
export const deepCascade = <TreeSelect {...tree} cascade="deep"/>;
// @ts-expect-error Tree source discriminants are preserved.
export const badSource = <TreeSelect {...tree} tree={{ mode: 'static', roots, getChildren: () => [], loadChildren: async () => [] }}/>;
// @ts-expect-error Label alternatives are mutually exclusive.
export const duplicateName = <TreeSelect {...tree} aria-label="Places"/>;
// @ts-expect-error Hydration returns raw Item objects.
export const badHydrate = <EntityPicker {...entity} hydrate={async () => ['raw string']}/>;
// @ts-expect-error nameFromField inherits the description from its provider.
export const fieldOwned = <EntityPicker nameFromField description="Owned" scopeKey="s" getKey={key} getLabel={label} load={load}/>;

// F13-R1 positive consumer contract: root measurement and semantic control focus are distinct public refs.
const rootRef=createRef<HTMLElement>(),focusRef=createRef<HTMLElement>();
const rootCallback:Ref<HTMLElement>=node=>{if(node){const measured:DOMRect=node.getBoundingClientRect();void measured;return()=>{};}};
const focusCallback:Ref<HTMLElement>=node=>{node?.focus();};
export const refFixtures=<><EntityPicker {...entity} ref={rootRef} focusRef={focusRef}/><TreeSelect {...tree} ref={rootRef} focusRef={focusRef}/><RootEntityPicker {...entity} ref={rootCallback} focusRef={focusCallback}/><RootTreeSelect {...tree} ref={rootCallback} focusRef={focusCallback}/></>;
