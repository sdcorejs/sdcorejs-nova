'use client';
import { Accordion as PrimitiveAccordion } from '@base-ui/react/accordion';
import { Collapsible as PrimitiveCollapsible } from '@base-ui/react/collapsible';
import { Component, createContext, useContext, useId, useRef, type ReactNode, type RefObject } from 'react';

import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';

export type CollapsibleSectionProps = ValueProps<boolean> & SurfaceProps & {
  title: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  actions?: ReactNode;
  disabled?: boolean;
  keepMounted?: boolean;
};
export type AccordionProps = ValueProps<readonly string[]> & SurfaceProps & {
  multiple?: boolean;
  children: ReactNode;
};
export type AccordionItemProps = SurfaceProps & {
  value: string;
  title: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  actions?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  keepMounted?: boolean;
};

type FocusGuardProps = {
  open: boolean;
  panel: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLElement | null>;
  children: ReactNode;
};

// A commit snapshot is earlier than DOM hiding/removal. A layout effect would
// run after that mutation and cannot fulfill focus-before-hide for parent closes.
// This boundary adds no element, state owner, or public API.
class PanelFocusGuard extends Component<FocusGuardProps> {
  override getSnapshotBeforeUpdate(previous: FocusGuardProps): null {
    const { open, panel, trigger } = this.props;
    const element = panel.current;
    if (previous.open && !open && element?.contains(element.ownerDocument.activeElement)) {
      trigger.current?.focus();
    }
    return null;
  }
  override componentDidUpdate(): void {
    // React requires this lifecycle alongside getSnapshotBeforeUpdate.
  }
  override render(): ReactNode { return this.props.children; }
}

const AccordionContext = createContext<readonly string[] | null>(null);
const EMPTY_VALUES: readonly string[] = Object.freeze([]);

export function CollapsibleSection(props: CollapsibleSectionProps) {
  const { value, defaultValue, onValueChange, title, headingLevel=3, children, actions,
    disabled, keepMounted=false, className, style, 'data-testid': testId } = props;
  const report = useDiagnostics('CollapsibleSection');
  const [open, setOpen] = useControllableValue({ value, defaultValue, onValueChange,
    fallback: false, disabled, report });
  const id = useId(), trigger = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLDivElement | null>(null);
  const Heading = `h${headingLevel}` as const;
  return <PrimitiveCollapsible.Root open={open} onOpenChange={setOpen} disabled={disabled}
    className={cx('nova-collapsible', className)} style={style} data-testid={testId}>
    <div className="nova-collapsible__header">
      <Heading className="nova-collapsible__heading">
        <PrimitiveCollapsible.Trigger ref={trigger} id={`${id}-trigger`} aria-controls={`${id}-panel`}
          className="nova-collapsible__trigger">{title}<span aria-hidden="true">{open ? '−' : '+'}</span></PrimitiveCollapsible.Trigger>
      </Heading>
      {actions && <div className="nova-collapsible__actions">{actions}</div>}
    </div>
    <PanelFocusGuard open={open} trigger={trigger} panel={panel}>
      <PrimitiveCollapsible.Panel ref={panel} id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`}
        keepMounted={keepMounted} hidden={!open} inert={!open || undefined} className="nova-collapsible__panel">
        {open || keepMounted ? children : null}
      </PrimitiveCollapsible.Panel>
    </PanelFocusGuard>
  </PrimitiveCollapsible.Root>;
}

export function Accordion(props: AccordionProps) {
  const { value, defaultValue, onValueChange, multiple=false, children, className, style, 'data-testid': testId } = props;
  const report = useDiagnostics('Accordion');
  const [current, setValue] = useControllableValue<readonly string[]>({ value, defaultValue, onValueChange,
    fallback: EMPTY_VALUES, report });
  const unique = [...new Set(current)];
  const selected = multiple ? unique : unique.slice(0, 1);
  return <AccordionContext value={selected}>
    <PrimitiveAccordion.Root<string> value={selected} multiple={multiple}
      onValueChange={next => setValue(multiple ? next : next.slice(-1))}
      className={cx('nova-accordion', className)} style={style} data-testid={testId}>
      {children}
    </PrimitiveAccordion.Root>
  </AccordionContext>;
}

export function AccordionItem(props: AccordionItemProps) {
  const { value, title, children, disabled, actions, headingLevel=3, keepMounted=false,
    className, style, 'data-testid': testId } = props;
  const selected = useContext(AccordionContext);
  if (selected === null) throw new Error('AccordionItem must be rendered inside Accordion.');
  const open = selected.includes(value), id = useId();
  const trigger = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLDivElement | null>(null);
  const Heading = `h${headingLevel}` as const;
  return <PrimitiveAccordion.Item value={value} disabled={disabled} className={cx('nova-collapsible', className)} style={style} data-testid={testId}>
    <div className="nova-collapsible__header">
      <PrimitiveAccordion.Header render={<Heading className="nova-collapsible__heading"/>}>
        <PrimitiveAccordion.Trigger ref={trigger} id={`${id}-trigger`} aria-controls={`${id}-panel`}
          className="nova-collapsible__trigger">{title}<span aria-hidden="true">{open ? '−' : '+'}</span></PrimitiveAccordion.Trigger>
      </PrimitiveAccordion.Header>
      {actions && <div className="nova-collapsible__actions">{actions}</div>}
    </div>
    <PanelFocusGuard open={open} trigger={trigger} panel={panel}>
      <PrimitiveAccordion.Panel ref={panel} id={`${id}-panel`} aria-labelledby={`${id}-trigger`} keepMounted={keepMounted}
        hidden={!open} inert={!open || undefined} className="nova-collapsible__panel">
        {open || keepMounted ? children : null}
      </PrimitiveAccordion.Panel>
    </PanelFocusGuard>
  </PrimitiveAccordion.Item>;
}
