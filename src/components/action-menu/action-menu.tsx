'use client';
import { Menu as Primitive } from '@base-ui/react/menu';
import { useLayoutEffect, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useAsyncAction } from '../../hooks/async-action/async-action.js';
import { cx } from '../../lib/cx.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import { PortalScope } from '../../providers/nova/portal-scope.js';
import type { Action, MenuAction, SurfaceProps } from '../../types/index.js';
export type ActionMenuProps<T> = SurfaceProps & {data:T;actions:readonly MenuAction<T>[];label:string;disabled?:boolean;onActionError?:(error:unknown,actionId:string)=>void};
export type QuickActionsProps<T> = ActionMenuProps<T>;

function visible<T>(actions:readonly MenuAction<T>[]){
  return actions.flatMap<MenuAction<T>>(action=>{
    if('children' in action){
      if(action.children.some(child=>'children' in child))return [];
      const children=action.children.filter(child=>!child.hidden);
      return children.length?[{...action,children}]:[];
    }
    return action.hidden?[]:[action];
  });
}
function ActionGroup<T>({group,pendingId,active,leaf}:{group:{id:string;label:string;children:readonly Action<T>[]};pendingId:string|null;active:RefObject<string|null>;leaf:(action:Action<T>)=>ReactNode}){
  const ownsPending=()=>active.current!==null && group.children.some(child=>child.id===active.current);
  return <Primitive.SubmenuRoot closeParentOnEsc={pendingId!==null} onOpenChange={(next,details)=>{
    if(!next && ownsPending() && details.reason!=='escape-key'){details.cancel();return;}
  }}>
    <Primitive.SubmenuTrigger className="nova-action-menu__item" disabled={pendingId!==null && !group.children.some(child=>child.id===pendingId)}>{group.label}<span aria-hidden="true" className="nova-action-menu__chevron">›</span></Primitive.SubmenuTrigger>
    <PortalScope>{(host,ref)=><Primitive.Portal ref={ref} container={host}>
      <Primitive.Positioner side="inline-end" sideOffset={4} collisionPadding={16} collisionAvoidance={{side:'flip',align:'shift'}} className="nova-action-menu__positioner"><Primitive.Popup aria-label={group.label} className="nova-action-menu">{group.children.map(leaf)}</Primitive.Popup></Primitive.Positioner>
    </Primitive.Portal>}</PortalScope>
  </Primitive.SubmenuRoot>;
}
export function ActionMenu<T>({data,actions,label,disabled=false,onActionError,className,style,'data-testid':testId}:ActionMenuProps<T>){
  const [open,setOpen]=useState(false),[pendingId,setPendingId]=useState<string|null>(null);
  const report=useDiagnostics('ActionMenu');
  const badDepth=actions.some(action=>'children' in action && action.children.some(child=>'children' in child));
  useEffect(()=>{if(badDepth)report('NOVA_MENU_DEPTH');},[badDepth,report]);
  const active=useRef<string|null>(null),mounted=useRef(true);
  const generation=useRef(0);
  const {run}=useAsyncAction(async(_context,action:Action<T>,snapshot:T)=>{await action.onAction(snapshot);});
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const selection=visible(actions);
  const effectiveVisible=open && !disabled && selection.length>0;
  const committedVisible=useRef(false);
  useLayoutEffect(()=>{
    if(committedVisible.current!==effectiveVisible){generation.current++;committedVisible.current=effectiveVisible;}
  },[effectiveVisible]);
  const execute=(action:Action<T>)=>{
    if(action.disabled || active.current!==null)return;
    active.current=action.id;setPendingId(action.id);const selectedGeneration=generation.current;
    void run(action,data).then(()=>{
      if(!mounted.current)return;
      active.current=null;setPendingId(null);if(generation.current===selectedGeneration)setOpen(false);
    },error=>{
      if(!mounted.current)return;
      active.current=null;setPendingId(null);
      // Error reporting remains consumer-owned; a throwing reporter must not
      // create an unhandled promise from a DOM selection event.
      try{onActionError?.(error,action.id);}catch{/* The consumer reporter owns its error boundary. */}
    });
  };
  const leaf=(action:Action<T>)=><Primitive.Item key={action.id} disabled={!!action.disabled || (pendingId!==null && pendingId!==action.id)} aria-disabled={action.disabled || pendingId===action.id || undefined} aria-busy={pendingId===action.id || undefined} closeOnClick={false} onClick={()=>execute(action)} label={action.label} className="nova-action-menu__item">{action.icon && <span aria-hidden="true" className="nova-action-menu__icon">{action.icon}</span>}<span>{action.label}</span></Primitive.Item>;
  if(!selection.length)return null;
  return <Primitive.Root modal={false} open={open && !disabled} onOpenChange={(next,details)=>{
    if(!next && active.current!==null && details.reason!=='escape-key'){details.cancel();return;}
    generation.current++;setOpen(next);
  }}>
    <Primitive.Trigger disabled={disabled} className={cx('nova-action-menu__trigger',className)} style={style} data-testid={testId}>{label}</Primitive.Trigger>
    <PortalScope>{(container,portalRef)=><Primitive.Portal ref={portalRef} container={container}>
      <Primitive.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={16} collisionAvoidance={{side:'flip',align:'shift'}} className="nova-action-menu__positioner">
        <Primitive.Popup aria-label={label} aria-busy={pendingId!==null || undefined} className="nova-action-menu">
          {selection.map(action=>'children' in action?<ActionGroup key={action.id} group={action} pendingId={pendingId} active={active} leaf={leaf}/>:leaf(action))}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>}</PortalScope>
  </Primitive.Root>;
}
export const QuickActions=ActionMenu;
