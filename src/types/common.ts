// Shared contract types (architecture-and-conventions "Types chung", refined by
// architecture §4: the nameFromField branch takes description/error/required
// from the Field). `DataState<T>` is intentionally not exported in P0 (Q-04).
import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from 'react';

export type ValueProps<T> =
  | { value: T; defaultValue?: never; onValueChange: (next: T) => void }
  | { value?: never; defaultValue?: T; onValueChange?: (next: T) => void };

export type SurfaceProps = { className?: string; style?: CSSProperties; 'data-testid'?: string };

export type FieldProps = {
  id?: string;
  name?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
};

export type AccessibleName =
  | { label: NonNullable<ReactNode>; 'aria-label'?: never; 'aria-labelledby'?: never; nameFromField?: never }
  | { label?: never; 'aria-label': string; 'aria-labelledby'?: never; nameFromField?: never }
  | { label?: never; 'aria-label'?: never; 'aria-labelledby': string; nameFromField?: never }
  | { label?: never; 'aria-label'?: never; 'aria-labelledby'?: never; nameFromField: true };

type ControlBase = Omit<Partial<FieldProps>, 'label'>
  & Pick<HTMLAttributes<HTMLElement>, 'onBlur' | 'onFocus' | 'title' | 'className' | 'style' | 'aria-describedby'>;

type FromFieldOwned = { description?: never; error?: never; required?: never };

export type ControlProps =
  | (ControlBase & Exclude<AccessibleName, { nameFromField: true }>)
  | (Omit<ControlBase, keyof FromFieldOwned> & FromFieldOwned & Extract<AccessibleName, { nameFromField: true }>);

export type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'aria-label' | 'aria-labelledby'
> & { ref?: Ref<HTMLInputElement> };

export type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'aria-label' | 'aria-labelledby'
> & { ref?: Ref<HTMLTextAreaElement> };

export type ResolvedAccessibleName = { id: string; ariaLabel?: string; ariaLabelledby?: string; ariaDescribedby?: string };

export type Key = string | number;

export type Action<T> = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  onAction: (data: T) => void | Promise<void>;
};

export type MenuAction<T> = Action<T> | { id: string; label: string; children: readonly Action<T>[] };

export type LoadContext = { signal: AbortSignal };
