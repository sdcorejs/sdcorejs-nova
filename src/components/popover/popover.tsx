'use client';
import { Popover as PrimitivePopover } from '@base-ui/react/popover';
import { Tooltip as PrimitiveTooltip } from '@base-ui/react/tooltip';
import { cloneElement, useId, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import { PortalScope } from '../../providers/nova/portal-scope.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';
export type PopoverProps = ValueProps<boolean> & SurfaceProps & {trigger: ReactElement; children: ReactNode; placement?: 'top'|'bottom'|'start'|'end'; label: string; initialFocusRef?: RefObject<HTMLElement|null>; returnFocusRef?: RefObject<HTMLElement|null>; disabled?: boolean};
export type TooltipProps = {content: string; children: ReactElement; delayMs?: number; disabled?: boolean};
export function Popover({value,defaultValue,onValueChange,trigger,children,placement='bottom',label,initialFocusRef,returnFocusRef,disabled=false,className,style,'data-testid':testId}:PopoverProps){
  const report=useDiagnostics('Popover');
  const [open,setOpen]=useControllableValue({value,defaultValue,onValueChange,fallback:false,report});
  const nativeButton=typeof trigger.type==='string' ? trigger.type==='button' : (trigger.props as {role?:string}).role!=='button';
  const side=placement==='start'?'inline-start':placement==='end'?'inline-end':placement;
  return <PrimitivePopover.Root open={open && !disabled} onOpenChange={next=>{if(!disabled)setOpen(next);}} modal={false}>
    <PrimitivePopover.Trigger render={trigger} disabled={disabled} nativeButton={nativeButton}/>
    <PortalScope>{(container,portalRef)=><PrimitivePopover.Portal ref={portalRef} container={container}>
      <PrimitivePopover.Positioner side={side} sideOffset={8} collisionPadding={16} collisionAvoidance={{side:'flip',align:'shift',fallbackAxisSide:'start'}} positionMethod="fixed" className="nova-popover__positioner">
        <PrimitivePopover.Popup aria-label={label} initialFocus={initialFocusRef ?? true} finalFocus={returnFocusRef ?? true} className={cx('nova-popover',className)} style={style} data-testid={testId}>{children}</PrimitivePopover.Popup>
      </PrimitivePopover.Positioner>
    </PrimitivePopover.Portal>}</PortalScope>
  </PrimitivePopover.Root>;
}
export function Tooltip({content,children,delayMs=600,disabled=false}:TooltipProps){
  const id=useId(),[open,setOpen]=useState(false);
  const existingDescription=(children.props as {'aria-describedby'?:string})['aria-describedby'];
  const describedBy=[existingDescription,open && !disabled && content.trim() ? id : undefined].filter(Boolean).join(' ') || undefined;
  const delay=Number.isFinite(delayMs)?Math.max(0,delayMs):600;
  return <PrimitiveTooltip.Provider delay={delay}>
    <PrimitiveTooltip.Root open={open && !disabled && !!content.trim()} onOpenChange={setOpen} disabled={disabled || !content.trim()} disableHoverablePopup={false}>
      <PrimitiveTooltip.Trigger render={cloneElement(children as ReactElement<{'aria-describedby'?:string}>, {'aria-describedby':describedBy})} delay={delay} aria-describedby={describedBy}/>
      <PortalScope>{(container,portalRef)=><PrimitiveTooltip.Portal ref={portalRef} container={container}>
        <PrimitiveTooltip.Positioner side="top" sideOffset={8} collisionPadding={16} collisionAvoidance={{side:'flip',align:'shift'}} positionMethod="fixed" className="nova-tooltip__positioner">
          <PrimitiveTooltip.Popup id={id} role="tooltip" className="nova-tooltip">{content}</PrimitiveTooltip.Popup>
        </PrimitiveTooltip.Positioner>
      </PrimitiveTooltip.Portal>}</PortalScope>
    </PrimitiveTooltip.Root>
  </PrimitiveTooltip.Provider>;
}
