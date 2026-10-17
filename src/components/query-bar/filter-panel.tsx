'use client';
import type {ReactNode,RefObject,Ref} from 'react';
import {useNovaScope} from '../../providers/nova/context.js';
import {queryStrings} from '../../query/query-field-editor.js';
import type {SurfaceProps} from '../../types/index.js';
import {Sheet} from '../dialog/dialog.js';
export type FilterPanelProps=SurfaceProps&{/** Rendered Sheet popup surface. */ref?:Ref<HTMLDivElement>;open:boolean;onOpenChange:(open:boolean)=>void;children:ReactNode;returnFocusRef?:RefObject<HTMLElement|null>};
/** A public controlled sheet; the caller owns any draft mounted inside it. */
export function FilterPanel({open,onOpenChange,children,returnFocusRef,ref:surfaceRef,...surface}:FilterPanelProps){const strings=queryStrings(useNovaScope());return <Sheet {...surface} ref={surfaceRef} value={open} onValueChange={onOpenChange} title={strings.filters} side="bottom" returnFocusRef={returnFocusRef}>{children}</Sheet>;}
