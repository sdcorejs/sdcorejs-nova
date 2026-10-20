'use client';
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { useCallback, useId, useInsertionEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type Ref } from 'react';

import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { PortalScope } from '../../providers/nova/portal-scope.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';

export type CloseReason = 'escape' | 'outside' | 'action';
export type DialogProps = ValueProps<boolean> & SurfaceProps & {
  /** Rendered popup surface; separate from initial and return focus ownership. */
  ref?: Ref<HTMLDivElement>;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  modal?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onCloseRequest?: (reason: CloseReason) => boolean | void;
  closeDisabled?: boolean;
};
export type SheetProps = DialogProps & {side?: 'start' | 'end' | 'bottom'; size?: 'sm' | 'md' | 'lg'};
export type DrawerProps = SheetProps;

const FOCUSABLE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex],[contenteditable="true"]';
function reachable(element: HTMLElement | null | undefined): element is HTMLElement {
  if (!element || !element.isConnected || element.matches(':disabled') || !element.matches(FOCUSABLE)
    || element.closest('[hidden],[inert]') || element.hasAttribute('data-base-ui-focus-guard')
    || element.hasAttribute('data-floating-ui-focus-guard')) return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = ancestor.ownerDocument.defaultView?.getComputedStyle(ancestor);
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  }
  return true;
}

// Sheet/Drawer only supply layout variants to this same state and focus owner.
function DialogSurface(props: DialogProps & {sheet?: boolean; side?: 'start' | 'end' | 'bottom'; size?: 'sm' | 'md' | 'lg'}) {
  const {value, defaultValue, onValueChange, title, description, children, modal=true, ref: surfaceRef,
    initialFocusRef, returnFocusRef, onCloseRequest, closeDisabled=false,
    className, style, 'data-testid': testId, sheet=false, side='end', size='md'} = props;
  const scope = useNovaScope(), report = useDiagnostics('Dialog');
  const [open, setOpen] = useControllableValue({value, defaultValue, onValueChange, fallback:false, report});
  const id = useId(), popup = useRef<HTMLDivElement | null>(null), body = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null), opener = useRef<HTMLElement | null>(null);
  const documentOwner = useRef<Document | null>(null), closeReason = useRef<CloseReason | null>(null);
  const [popupElement,setPopupElement]=useState<HTMLDivElement|null>(null);
  const consumerRef = useRef(surfaceRef);
  const consumerLease = useRef<{node: HTMLDivElement; ref: Ref<HTMLDivElement>; release: () => void} | null>(null);
  // Abandoned renders must never publish a new consumer ref.
  useInsertionEffect(() => {consumerRef.current = surfaceRef;}, [surfaceRef]);
  const syncConsumerRef = useCallback((element: HTMLDivElement | null) => {
    const previous = consumerLease.current, next = consumerRef.current;
    if (previous?.node === element && previous.ref === next) return;
    consumerLease.current = null;
    previous?.release();
    if (!element || !next) return;
    let release: () => void;
    if (typeof next === 'function') {
      const cleanup = next(element);
      release = typeof cleanup === 'function' ? cleanup : () => {next(null);};
    } else {
      next.current = element;
      release = () => {next.current = null;};
    }
    consumerLease.current = {node: element, ref: next, release};
  }, []);
  // Replacing a consumer ref must not detach the private popup ref and
  // recapture its opener while focus is already inside the dialog.
  useLayoutEffect(() => {syncConsumerRef(popup.current);}, [surfaceRef, syncConsumerRef]);
  const focusOwner=useRef({open,modal});
  // Child focus-manager cleanup runs before parent layout-effect cleanup.
  // Publish the closing state first so its return focus is not recaptured.
  useInsertionEffect(()=>{focusOwner.current={open,modal};return()=>{focusOwner.current={open:false,modal};};},[open,modal]);
  useLayoutEffect(()=>{
    if(!open||!modal||!popupElement)return;
    const owner=popupElement.ownerDocument,portal=popupElement.parentElement;
    let last:HTMLElement|null=null;
    // Base UI traps sequential Tab navigation and hides outside nodes from AT.
    // Also retain modal ownership when consumer code directly calls .focus().
    const retain=(event:FocusEvent)=>{
      if(!focusOwner.current.open||!focusOwner.current.modal)return;
      const target=event.target as Node|null;
      if(portal?.contains(target)){if(popupElement.contains(target))last=target as HTMLElement;return;}
      // A nested or sibling modal may currently own focus.
      if(popupElement.closest('[aria-hidden="true"],[inert]'))return;
      const destination=reachable(last)&&popupElement.contains(last)?last:heading.current;
      destination?.focus({preventScroll:true});
    };
    owner.addEventListener('focusin',retain);
    return()=>owner.removeEventListener('focusin',retain);
  },[open,modal,popupElement]);
  useLayoutEffect(() => {
    if (!open) return;
    const owner = popup.current?.ownerDocument ?? document;
    documentOwner.current = owner;
    const active = owner.activeElement;
    if (active && active !== owner.body && !popup.current?.contains(active)) opener.current = active as HTMLElement;
    closeReason.current = null;
  }, [open, scope.portalContainer]);
  const assignPopup = useCallback((element: HTMLDivElement | null) => {
    popup.current = element;setPopupElement(element);
    if (!element) {syncConsumerRef(null);return;}
    const owner = element.ownerDocument;
    documentOwner.current = owner;
    const active = owner.activeElement;
    opener.current = active && active !== owner.body && !element.contains(active) ? active as HTMLElement : null;
    syncConsumerRef(element);
  }, [syncConsumerRef]);
  const initialFocus = useCallback((interaction: string) => {
    if(!focusOwner.current.open)return false;
    const candidate = initialFocusRef?.current;
    if (reachable(candidate) && popup.current?.contains(candidate)) return candidate;
    if (!modal && !initialFocusRef) return false;
    if (interaction !== 'touch') {
      const first = [...(body.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        .find(element => reachable(element) && element.tabIndex >= 0);
      if (first) return first;
    }
    return heading.current ?? true;
  }, [initialFocusRef, modal]);
  const finalFocus = useCallback(() => {
    if (!modal && closeReason.current !== 'action') return false;
    const explicit=returnFocusRef?.current;
    if (reachable(explicit)) {
      // React restores the pre-mutation focused node after moving a portal
      // host. Match the primitive's microtask timing, but focus the exact ref
      // rather than its first tabbable child (e.g. a tabindex -1 main).
      const ownership=focusOwner.current;
      queueMicrotask(()=>{
        if(focusOwner.current!==ownership||ownership.open||!reachable(explicit)||explicit.closest('[aria-hidden="true"]'))return;
        explicit.focus({preventScroll:true});
      });
      return false;
    }
    if (reachable(opener.current)) return opener.current;
    const fallback = [...(documentOwner.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      .find(element => reachable(element) && element.tabIndex >= 0 && !popup.current?.contains(element));
    return fallback ?? false;
  }, [returnFocusRef, modal]);
  const request = (next: boolean, details: Primitive.Root.ChangeEventDetails) => {
    if (next) {setOpen(true);return;}
    const reason: CloseReason = details.reason === 'escape-key' ? 'escape'
      : details.reason === 'outside-press' || details.reason === 'focus-out' ? 'outside' : 'action';
    if (closeDisabled || onCloseRequest?.(reason) === false) {details.cancel();return;}
    closeReason.current = reason;
    setOpen(false);
  };
  return <Primitive.Root open={open} onOpenChange={request} modal={modal} disablePointerDismissal={closeDisabled}>
    <PortalScope modal={modal}>{(container, portalRef) => <Primitive.Portal ref={portalRef} container={container}>
      {modal && <Primitive.Backdrop className="nova-dialog__backdrop"/>}
      <Primitive.Popup ref={assignPopup} initialFocus={initialFocus} finalFocus={finalFocus}
        aria-modal={modal || undefined} aria-labelledby={`${id}-title`} aria-describedby={description == null ? undefined : `${id}-description`}
        className={cx('nova-dialog', sheet && 'nova-sheet', className)} style={style} data-testid={testId}
        data-side={sheet ? side : undefined} data-size={sheet ? size : undefined}>
        <div className="nova-dialog__header">
          <div className="nova-dialog__intro">
            <Primitive.Title ref={heading} id={`${id}-title`} tabIndex={-1} className="nova-dialog__title">{title}</Primitive.Title>
            {description != null && <Primitive.Description id={`${id}-description`} className="nova-dialog__description">{description}</Primitive.Description>}
          </div>
          <Primitive.Close className="nova-dialog__close" disabled={closeDisabled} aria-label={scope.strings.common.close}><Icon name="close"/></Primitive.Close>
        </div>
        <div ref={body} className="nova-dialog__body">{children}</div>
      </Primitive.Popup>
    </Primitive.Portal>}</PortalScope>
  </Primitive.Root>;
}

export function Dialog(props: DialogProps) {return <DialogSurface {...props}/>;}
export function Sheet(props: SheetProps) {return <DialogSurface {...props} sheet/>;}
export const Drawer = Sheet;
