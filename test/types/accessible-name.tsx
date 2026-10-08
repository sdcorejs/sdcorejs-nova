// Type fixture (evidence class T): every @ts-expect-error must be consumed.
import type { AccessibleName, ControlProps, Key, ValueProps } from '../../src/types/index.js';

export const named: AccessibleName[] = [
  { label: 'Email' },
  { 'aria-label': 'Tìm kiếm' },
  { 'aria-labelledby': 'heading-id' },
  { nameFromField: true },
];

// @ts-expect-error label and aria-label are mutually exclusive
export const labelAndAria: AccessibleName = { label: 'Email', 'aria-label': 'Email' };

// @ts-expect-error a control needs one naming source
export const unnamed: ControlProps = {};

// @ts-expect-error nameFromField takes description from the Field
export const fieldWithDescription: ControlProps = { nameFromField: true, description: 'Gợi ý' };

// @ts-expect-error nameFromField takes required from the Field
export const fieldWithRequired: ControlProps = { nameFromField: true, required: true };

// @ts-expect-error nameFromField takes error from the Field
export const fieldWithError: ControlProps = { nameFromField: true, error: 'Sai' };

export const standalone: ControlProps = { label: 'Email', description: 'Gợi ý', required: true, error: 'Sai' };
export const fromField: ControlProps = { nameFromField: true, disabled: true, name: 'email' };

export const controlled: ValueProps<string | null> = { value: null, onValueChange: () => {} };
export const uncontrolled: ValueProps<string> = { defaultValue: 'x' };

// @ts-expect-error value and defaultValue are mutually exclusive
export const both: ValueProps<string> = { value: 'a', defaultValue: 'b', onValueChange: () => {} };

// @ts-expect-error controlled value requires onValueChange
export const controlledWithoutCallback: ValueProps<string> = { value: 'a' };

export const keys: Key[] = [0, 'a'];
// @ts-expect-error Key is string | number only
export const objectKey: Key = { id: 1 };
