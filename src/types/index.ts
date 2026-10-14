import type { NativeInputProps } from './common.js';

export type {
  AccessibleName,
  Action,
  ControlProps,
  FieldProps,
  Key,
  LoadContext,
  MenuAction,
  NativeInputProps,
  NativeTextareaProps,
  ResolvedAccessibleName,
  SurfaceProps,
  ValueProps,
} from './common.js';

/** Native input handlers and form ownership, with Nova-managed semantics excluded. */
export type P1InputProps = Omit<NativeInputProps, 'aria-invalid' | 'aria-required' | 'role' | 'children'>;
export type { DateRange, DateTimeAdapter, ISODate, ISOInstant, LocalTime, WallTimeResult } from './temporal.js';
