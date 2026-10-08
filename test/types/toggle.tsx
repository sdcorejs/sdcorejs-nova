// Type fixture (evidence class T) for ./checkbox and ./switch.
import { createRef } from 'react';

import { Checkbox } from '../../src/components/checkbox/index.js';
import { Switch } from '../../src/components/switch/index.js';

const elementRef = createRef<HTMLElement>();
const inputRef = createRef<HTMLInputElement>();

export const ok = [
  <Checkbox key="a" label="A" value="mixed" onValueChange={(next: boolean | 'mixed') => next} />,
  <Checkbox key="b" aria-label="B" defaultValue ref={elementRef} inputRef={inputRef} submissionValue="yes" name="b" form="f" autoComplete="off" />,
  <Checkbox key="c" nameFromField />,
  <Switch key="d" label="D" value onValueChange={(next: boolean) => next} />,
  <Switch key="e" aria-labelledby="h" defaultValue={false} />,
];

// @ts-expect-error Switch value 'mixed' rejected
export const mixedSwitch = <Switch label="x" value="mixed" onValueChange={() => {}} />;

// @ts-expect-error Switch defaultValue 'mixed' rejected
export const mixedSwitchDefault = <Switch label="x" defaultValue="mixed" />;

// @ts-expect-error a checkbox needs a naming source
export const unnamedCheckbox = <Checkbox />;

// @ts-expect-error label and aria-label are exclusive
export const doubleNamed = <Checkbox label="a" aria-label="a" />;

// @ts-expect-error nameFromField takes required from the Field
export const fieldRequired = <Checkbox nameFromField required />;

// @ts-expect-error submissionValue is a string
export const numericSubmission = <Checkbox label="a" submissionValue={1} />;

// @ts-expect-error inputRef targets the hidden input element
export const wrongInputRef = <Switch label="a" inputRef={createRef<HTMLButtonElement>()} />;

// @ts-expect-error controlled value requires onValueChange
export const controlledWithoutCallback = <Checkbox label="a" value />;
