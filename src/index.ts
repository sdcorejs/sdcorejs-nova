// Root barrel (Q-01, INV-004): explicit named re-exports of every P0/P1 public
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
  DateRange,
  DateTimeAdapter,
  FieldProps,
  ISODate,
  ISOInstant,
  Key,
  LoadContext,
  LocalTime,
  MenuAction,
  NativeInputProps,
  NativeTextareaProps,
  P1InputProps,
  ResolvedAccessibleName,
  SurfaceProps,
  ValueProps,
  WallTimeResult,
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

export { Accordion, AccordionItem, CollapsibleSection } from './components/accordion/accordion.js';
export type { AccordionProps, AccordionItemProps, CollapsibleSectionProps } from './components/accordion/accordion.js';

export { ActionMenu, QuickActions } from './components/action-menu/action-menu.js';
export type { ActionMenuProps, QuickActionsProps } from './components/action-menu/action-menu.js';

export { AnchorNavigation, AnchorSection } from './components/anchor-navigation/anchor-navigation.js';
export type { AnchorItem, ActiveAnchorProps, AnchorNavigationProps, AnchorSectionProps } from './components/anchor-navigation/anchor-navigation.js';

export { AppShell, Navigation, Sidebar } from './components/app-shell/app-shell.js';
export type { AppShellProps, MobileSidebarProps, NavigationProps, NavItem, NavLink, SidebarProps } from './components/app-shell/app-shell.js';

export { BusyBoundary } from './components/busy-boundary/busy-boundary.js';
export type { BusyBoundaryProps } from './components/busy-boundary/busy-boundary.js';

export { CopyButton } from './components/copy-button/copy-button.js';
export type { CopyButtonProps } from './components/copy-button/copy-button.js';

export { Calendar, DatePicker, DateRangePicker } from './components/date-picker/date-picker.js';
export type { CalendarBase, CalendarProps, DatePickerProps, DateRangePickerProps } from './components/date-picker/date-picker.js';

export {DateTimePicker} from './components/date-time-picker/date-time-picker.js';
export type {DateTimePickerProps} from './components/date-time-picker/date-time-picker.js';

export { Dialog, Sheet, Drawer } from './components/dialog/dialog.js';
export type { CloseReason, DialogProps, SheetProps, DrawerProps } from './components/dialog/dialog.js';

export { Highlight } from './components/highlight/highlight.js';
export type { HighlightProps } from './components/highlight/highlight.js';
export { findHighlightRanges } from './lib/highlight-ranges.js';

export { InlineEdit } from './components/inline-edit/inline-edit.js';
export type { InlineEditCommit, InlineEditProps, Revision } from './components/inline-edit/inline-edit.js';

export { InlineText } from './components/inline-text/inline-text.js';
export type { InlineTextProps } from './components/inline-text/inline-text.js';

export {MultiSelect,ChipInput} from './components/multi-select/multi-select.js';
export type {MultiSelectProps,ChipInputProps} from './components/multi-select/multi-select.js';

export {NumberInput} from './components/number-input/number-input.js';
export type {NumberInputProps} from './components/number-input/number-input.js';

export { Popover, Tooltip } from './components/popover/popover.js';
export type { PopoverProps, TooltipProps } from './components/popover/popover.js';

export { ReadOnlyValue, View } from './components/read-only-value/read-only-value.js';
export type { ReadOnlyValueProps, ViewProps } from './components/read-only-value/read-only-value.js';

export { ScrollArea } from './components/scroll-area/scroll-area.js';
export type { ScrollAreaProps } from './components/scroll-area/scroll-area.js';

export { SegmentedControl } from './components/segmented-control/segmented-control.js';
export type { SegmentValue, SegmentOption, SegmentedControlProps } from './components/segmented-control/segmented-control.js';

export {Select,Combobox,Autocomplete} from './components/select/select.js';
export type {SelectProps,ComboboxProps,AutocompleteProps,Option} from './components/select/select.js';

export { Stepper, type Step, type StepperProps } from './components/stepper/stepper.js';

export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabListProps, type TabProps, type TabPanelProps } from './components/tabs/tabs.js';

export {TimeInput,TimeRangeInput} from './components/time-input/time-input.js';
export type {TimeInputProps,TimeRangeInputProps} from './components/time-input/time-input.js';

export { ActionInProgressError, useAsyncAction } from './hooks/async-action/async-action.js';

export { useClipboard } from './hooks/clipboard/clipboard.js';

export { useFormValidation } from './hooks/form-validation/form-validation.js';
export type { ValidationIssue, ValidationResult, Validator } from './hooks/form-validation/form-validation.js';

export { formatRelative } from './lib/civil-date.js';
export type { RelativeUnit } from './lib/civil-date.js';
export { useFormatter, useRelativeTime } from './hooks/formatter/formatter.js';

export { useMediaQuery, useViewport } from './hooks/viewport/viewport.js';

export { ConfirmProvider, useConfirm } from './providers/confirm/confirm.js';
export type { ConfirmOptions, ConfirmResult, ConfirmProviderProps } from './providers/confirm/confirm.js';

export { ToastProvider, useToast } from './providers/toast/toast.js';
export type { ToastInput, ToastProviderProps } from './providers/toast/toast.js';

export {UnsavedChangesProvider,useUnsavedChanges,useConfirmLeave} from './providers/unsaved-changes/unsaved-changes.js';
export type {UnsavedOptions,LeavePrompt,UnsavedChangesProviderProps} from './providers/unsaved-changes/unsaved-changes.js';
