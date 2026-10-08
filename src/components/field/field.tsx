'use client';
// Field (F01, §11, INV-009): owns the ids of its label/description/error and
// exactly ONE nameFromField control. `useFieldControl` is the internal contract
// every Nova control uses to resolve its accessible name (D-019).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { isEmptyLabel, mergeIds, resolveAccessibleName, type FieldLink } from '../../lib/accessible-name.js';
import { cx } from '../../lib/cx.js';
import type { DiagnosticCode } from '../../lib/diagnostics.js';
import type { SurfaceProps } from '../../types/index.js';
import { Label } from './label.js';

export type FieldRootProps = SurfaceProps & {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

type FieldContextValue = {
  link: FieldLink;
  owners: readonly object[];
  register: (token: object) => () => void;
};

const FieldContext = createContext<FieldContextValue | null>(null);

export function Field({
  id,
  label,
  description,
  error,
  required = false,
  children,
  className,
  style,
  'data-testid': testId,
  ref,
}: FieldRootProps) {
  const base = useId();
  const hasDescription = !isEmptyLabel(description);
  const hasError = !isEmptyLabel(error);
  const labelEmpty = isEmptyLabel(label);
  const [owners, setOwners] = useState<readonly object[]>([]);

  const register = useCallback((token: object) => {
    setOwners((previous) => (previous.includes(token) ? previous : [...previous, token]));
    return () => setOwners((previous) => previous.filter((owner) => owner !== token));
  }, []);

  const link = useMemo<FieldLink>(() => ({
    controlId: id ?? `${base}control`,
    labelId: `${base}label`,
    descriptionId: hasDescription ? `${base}description` : undefined,
    errorId: hasError ? `${base}error` : undefined,
    required,
    invalid: hasError,
    labelEmpty,
  }), [id, base, hasDescription, hasError, required, labelEmpty]);

  const context = useMemo(() => ({ link, owners, register }), [link, owners, register]);

  return (
    <FieldContext.Provider value={context}>
      <div ref={ref} className={cx('nova-field', className)} style={style} data-testid={testId}>
        {labelEmpty ? null : <Label id={link.labelId} htmlFor={link.controlId} required={required}>{label}</Label>}
        {hasDescription ? <p id={link.descriptionId} className="nova-field__description">{description}</p> : null}
        {children}
        {hasError ? <p id={link.errorId} className="nova-field__error">{error}</p> : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Accessible configuration error rendered instead of an unnamed control (D-019). */
export function FieldControlError({ code, component }: { code: DiagnosticCode; component: string }) {
  const { strings } = useNovaScope();
  const report = useDiagnostics(component);
  useEffect(() => report(code), [report, code]);
  return <span className="nova-config-error" data-nova-config-error={code}>{strings.forms.configurationError}</span>;
}

type ControlNameProps = {
  id?: string | undefined;
  label?: ReactNode;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-describedby'?: string | undefined;
  nameFromField?: boolean | undefined;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean | undefined;
};

export type FieldControlOptions = {
  component: string;
  /** `span` for non-labelable roots such as a radiogroup (named via aria-labelledby). */
  labelAs?: 'label' | 'span';
  /** `after` places a standalone label after the control (checkbox/switch). */
  labelPlacement?: 'before' | 'after';
};

export type FieldControl =
  | { ok: false; code: DiagnosticCode }
  | {
    ok: true;
    id: string;
    ariaLabel: string | undefined;
    ariaLabelledby: string | undefined;
    ariaDescribedby: string | undefined;
    invalid: boolean;
    required: boolean;
    /** Id of the visible label element (own or Field's), when there is one. */
    labelId: string | undefined;
    /** Wraps a standalone control with its own label/description/error. */
    wrap: (control: ReactNode) => ReactNode;
  };

export function useFieldControl(props: ControlNameProps, options: FieldControlOptions): FieldControl {
  const field = useContext(FieldContext);
  const own = useId();
  const [token] = useState(() => ({}));
  const fromField = props.nameFromField === true;
  const register = field?.register;
  useLayoutEffect(() => (fromField && register ? register(token) : undefined), [fromField, register, token]);

  const report = useDiagnostics(options.component);
  const labelledby = props['aria-labelledby'];
  useEffect(() => {
    if (fromField || !labelledby?.trim()) return;
    const missing = labelledby.trim().split(/\s+/u).some((id) => !document.getElementById(id));
    if (missing) report('NOVA_LABELLEDBY_DANGLING');
  }, [fromField, labelledby, report]);

  const resolution = resolveAccessibleName(props, fromField ? field?.link ?? null : null);
  if (!resolution.ok) return { ok: false, code: resolution.code };

  if (resolution.kind === 'field') {
    const index = field!.owners.indexOf(token);
    if (index > 0) return { ok: false, code: 'NOVA_FIELD_DUPLICATE_CONTROL' };
    const link = resolution.field;
    return {
      ok: true,
      id: link.controlId,
      ariaLabel: undefined,
      ariaLabelledby: options.labelAs === 'span' ? link.labelId : undefined,
      ariaDescribedby: mergeIds(link.descriptionId, link.errorId, props['aria-describedby']),
      invalid: link.invalid,
      required: link.required,
      labelId: link.labelId,
      wrap: (control) => control,
    };
  }

  const id = props.id ?? `${own}control`;
  const hasDescription = !isEmptyLabel(props.description);
  const hasError = !isEmptyLabel(props.error);
  const descriptionId = hasDescription ? `${own}description` : undefined;
  const errorId = hasError ? `${own}error` : undefined;
  const labelId = resolution.kind === 'label' ? `${own}label` : undefined;
  const required = props.required === true;
  const placement = options.labelPlacement ?? 'before';

  const labelElement = resolution.kind !== 'label' ? null : options.labelAs === 'span'
    ? <span id={labelId} className="nova-label">{resolution.label}</span>
    : <Label id={labelId} htmlFor={id} required={required}>{resolution.label}</Label>;

  return {
    ok: true,
    id,
    ariaLabel: resolution.kind === 'aria-label' ? resolution.ariaLabel : undefined,
    ariaLabelledby: resolution.kind === 'aria-labelledby'
      ? resolution.ariaLabelledby
      : options.labelAs === 'span' ? labelId : undefined,
    ariaDescribedby: mergeIds(descriptionId, errorId, props['aria-describedby']),
    invalid: hasError,
    required,
    labelId,
    wrap: (control) => (!labelElement && !hasDescription && !hasError ? control : (
      <div className={cx('nova-field', placement === 'after' && 'nova-field--inline')}>
        {placement === 'before' ? labelElement : null}
        {hasDescription && placement === 'before' ? <p id={descriptionId} className="nova-field__description">{props.description}</p> : null}
        {control}
        {placement === 'after' ? labelElement : null}
        {hasDescription && placement === 'after' ? <p id={descriptionId} className="nova-field__description">{props.description}</p> : null}
        {hasError ? <p id={errorId} className="nova-field__error">{props.error}</p> : null}
      </div>
    )),
  };
}
