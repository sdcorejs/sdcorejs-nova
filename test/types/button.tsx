// Type fixture (evidence class T) for ./button.
import { createRef } from 'react';

import { Button, ButtonGroup, IconButton } from '../../src/components/button/index.js';

const ref = createRef<HTMLButtonElement>();

export const ok = [
  <Button key="a" ref={ref} variant="danger" size="sm" type="submit">Lưu</Button>,
  <Button key="b" render={(props, state) => <button {...props} data-loading={state.loading} />}>Go</Button>,
  <Button key="c" render={<button type="button" />}>Go</Button>,
  <IconButton key="d" label="Đóng" icon={<svg />} />,
  <ButtonGroup key="e" label="Nhóm"><Button>A</Button></ButtonGroup>,
  <ButtonGroup key="f" aria-labelledby="h"><Button>A</Button></ButtonGroup>,
];

// @ts-expect-error IconButton without label rejected
export const iconWithoutLabel = <IconButton icon={<svg />} />;

// @ts-expect-error IconButton is named by label, not aria-label
export const iconWithAriaLabel = <IconButton aria-label="x" label="x" icon={<svg />} />;

// @ts-expect-error Button requires children
export const buttonWithoutChildren = <Button />;

// @ts-expect-error type is button | submit | reset
export const badType = <Button type="link">x</Button>;

// @ts-expect-error variant is a closed set
export const badVariant = <Button variant="link">x</Button>;

// @ts-expect-error ButtonGroup needs a label or aria-labelledby
export const unnamedGroup = <ButtonGroup><Button>A</Button></ButtonGroup>;

// @ts-expect-error ButtonGroup takes label OR aria-labelledby, not both
export const doubleNamedGroup = <ButtonGroup label="a" aria-labelledby="b"><Button>A</Button></ButtonGroup>;

// @ts-expect-error ref targets a button element
export const wrongRef = <Button ref={createRef<HTMLAnchorElement>()}>x</Button>;
