// Root barrel (Q-01, INV-004): explicit named re-exports of every P0 public
// symbol — never a star re-export, no directive (each client module keeps its own).
// Prefer the subpaths (`@sdcorejs/nova/button`, …) for the smallest bundles.

export { NovaProvider, ThemeProvider, useNovaTheme } from './providers/nova/index.js';
export type { NovaProviderProps, NovaTheme, ThemeProviderProps } from './providers/nova/index.js';

export { en, vi } from './i18n/index.js';
export type { NovaStringOverrides, NovaStrings } from './i18n/index.js';

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
} from './types/index.js';

export { Button, ButtonGroup, IconButton } from './components/button/index.js';
export type { ButtonGroupProps, ButtonProps, ButtonState, IconButtonProps } from './components/button/index.js';

export { Avatar, AvatarGroup } from './components/avatar/index.js';
export type { AvatarGroupProps, AvatarProps } from './components/avatar/index.js';

export { Badge } from './components/badge/index.js';
export type { BadgeProps } from './components/badge/index.js';

export { Card, CardGroup, Section, SectionItem } from './components/card/index.js';
export type { CardGroupProps, CardProps, SectionItemProps, SectionProps } from './components/card/index.js';

export { Link } from './components/link/index.js';
export type { LinkProps } from './components/link/index.js';

export { Breadcrumb } from './components/breadcrumb/index.js';
export type { BreadcrumbItem, BreadcrumbProps } from './components/breadcrumb/index.js';

export { Alert } from './components/alert/index.js';
export type { AlertProps } from './components/alert/index.js';

export { DataState, Empty, Progress, Skeleton, Spinner } from './components/data-state/index.js';
export type { DataStateProps, EmptyProps, ProgressProps, SkeletonProps, SpinnerProps } from './components/data-state/index.js';

export { Field, FormErrors, Label, focusFirstInvalid } from './components/field/index.js';
export type { FieldRootProps, FormErrorsProps, LabelProps } from './components/field/index.js';

export { Input, InputGroup, Textarea } from './components/input/index.js';
export type { InputGroupProps, InputProps, TextareaProps } from './components/input/index.js';

export { Checkbox } from './components/checkbox/index.js';
export type { CheckboxProps } from './components/checkbox/index.js';

export { Switch } from './components/switch/index.js';
export type { SwitchProps } from './components/switch/index.js';

export { RadioGroup } from './components/radio-group/index.js';
export type { RadioGroupProps, RadioOption } from './components/radio-group/index.js';
