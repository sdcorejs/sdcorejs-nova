'use client';
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { useCallback, useEffect, useId, useInsertionEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type Ref } from 'react';

import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { PortalScope } from '../../providers/nova/portal-scope.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';

export type CloseReason = 'escape' | 'outside' | 'action';
/** Props shared by Dialog, Sheet/Drawer and ResizableDialog; each adds its own `size`. */
export type DialogBaseProps = ValueProps<boolean> & SurfaceProps & {
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
  /** Actions row pinned under the scrolling body. */
  footer?: ReactNode;
};
export type DialogProps = DialogBaseProps & {
  /** sm 400, md 560, lg 800 px, or a custom width in px (`480` or `'480px'`). Omitted: 512 px. */
  size?: 'sm' | 'md' | 'lg' | number | `${number}px`;
};
export type SheetProps = DialogBaseProps & {side?: 'start' | 'end' | 'bottom'; size?: 'sm' | 'md' | 'lg'};
export type DrawerProps = SheetProps;

const PX = /^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?px$/iu;
/** A named width, a positive finite custom width, or invalid (the default width is kept). */
function dialogWidth(size: unknown): {name?: 'sm' | 'md' | 'lg'; width?: string; invalid: boolean} {
  if (size === undefined) return {invalid: false};
  if (size === 'sm' || size === 'md' || size === 'lg') return {name: size, invalid: false};
  const px = typeof size === 'number' ? size : typeof size === 'string' && PX.test(size) ? Number.parseFloat(size) : Number.NaN;
  return Number.isFinite(px) && px > 0 ? {width: `${px}px`, invalid: false} : {invalid: true};
}

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
function DialogSurface(props: DialogBaseProps & ({sheet?: false; size?: DialogProps['size']} | {sheet: true; side?: 'start' | 'end' | 'bottom'; size?: 'sm' | 'md' | 'lg'})) {
  const {value, defaultValue, onValueChange, title, description, children, footer, modal=true, ref: surfaceRef,
    initialFocusRef, returnFocusRef, onCloseRequest, closeDisabled=false,
    className, style, 'data-testid': testId} = props;
  const sheet = props.sheet === true, side = props.sheet ? props.side ?? 'end' : undefined;
  const scope = useNovaScope(), report = useDiagnostics('Dialog');
  const layout = sheet ? {name: props.size ?? 'md', invalid: false} : dialogWidth(props.size);
  useEffect(() => {if (layout.invalid) report('NOVA_DIALOG_INVALID_SIZE');}, [layout.invalid, report]);
  const [open, setOpen] = useControllableValue({value, defaultValue, onValueChange, fallback:false, report});
  const id = useId(), popup = useRef<HTMLDivElement | null>(null), body = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null), opener = useRef<HTMLElement | null>(null);
  const documentOwner = useRef<Document | null>(null), closeReason = useRef<CloseReason | null>(null), focusAtClose = useRef<Element | null>(null);
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
  // Remember the last node inside the overlay that held focus while it was
  // open. The value survives the close so finalFocus can tell a parked node
  // (same element, moved out) from a user focus move (different element).
  useLayoutEffect(() => {
    if (!open || !popupElement) return;
    const owner = popupElement.ownerDocument, overlay = popupElement.parentElement ?? popupElement;
    const active = owner.activeElement;
    focusAtClose.current = active && overlay.contains(active) ? active : null;
    const track = (event: FocusEvent) => { if (event.target instanceof Element && overlay.contains(event.target)) focusAtClose.current = event.target; };
    owner.addEventListener('focusin', track, true);
    return () => owner.removeEventListener('focusin', track, true);
  }, [open, popupElement]);
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
    // Base UI skips its own "focus moved elsewhere" check for a function
    // finalFocus. Restore only while focus is lost to the body or still in the
    // closing overlay; focus the user or app moved outside during exit stays.
    // Content parked out of the overlay (e.g. a Sidebar moving its host back)
    // keeps the node focused at close start; that is not a user focus move.
    // Focus still on the opener means it never entered the overlay (closed
    // before initial focus, e.g. a Sidebar drawer closed by a desktop resize).
    const owner=documentOwner.current,active=owner?.activeElement,overlay=popup.current?.parentElement;
    const mayReturn=(target:HTMLElement)=>!active||active===owner?.body||active===target||active===opener.current||active===focusAtClose.current||!!overlay?.contains(active);
    const explicit=returnFocusRef?.current;
    if (reachable(explicit)) {
      if (!mayReturn(explicit)) return false;
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
    if (reachable(opener.current)) return mayReturn(opener.current) ? opener.current : false;
    const fallback = [...(owner?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      .find(element => reachable(element) && element.tabIndex >= 0 && !popup.current?.contains(element));
    return fallback && mayReturn(fallback) ? fallback : false;
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
        className={cx('nova-dialog', sheet && 'nova-sheet', className)} style={'width' in layout && layout.width ? {inlineSize: layout.width, ...style} : style} data-testid={testId}
        data-side={side} data-size={layout.name}>
        <div className="nova-dialog__header">
          <div className="nova-dialog__intro">
            <Primitive.Title ref={heading} id={`${id}-title`} tabIndex={-1} className="nova-dialog__title">{title}</Primitive.Title>
            {description != null && <Primitive.Description id={`${id}-description`} className="nova-dialog__description">{description}</Primitive.Description>}
          </div>
          <Primitive.Close className="nova-dialog__close" disabled={closeDisabled} aria-label={scope.strings.common.close}><Icon name="close"/></Primitive.Close>
        </div>
        <div ref={body} className="nova-dialog__body">{children}</div>
        {footer != null && <div className="nova-dialog__footer">{footer}</div>}
      </Primitive.Popup>
    </Primitive.Portal>}</PortalScope>
  </Primitive.Root>;
}

export function Dialog(props: DialogProps) {return <DialogSurface {...props}/>;}
export function Sheet(props: SheetProps) {return <DialogSurface {...props} sheet/>;}
export const Drawer = Sheet;
