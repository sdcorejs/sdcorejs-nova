// Consumer type fixture (evidence class T) against the PACKAGED declarations:
// every import goes through the package `exports` map (self-reference to
// dist/**/*.d.ts), never through src. Run with the pinned TypeScript and 5.7.
// Root-barrel parity is checked in test/package/dist.test.ts.
import { createRef } from 'react';

import { Alert } from '@sdcorejs/nova/alert';
import { Avatar, AvatarGroup } from '@sdcorejs/nova/avatar';
import { Badge } from '@sdcorejs/nova/badge';
import { Breadcrumb, type BreadcrumbItem } from '@sdcorejs/nova/breadcrumb';
import { Button, ButtonGroup, IconButton } from '@sdcorejs/nova/button';
import { Card, CardGroup, Section, SectionItem } from '@sdcorejs/nova/card';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { DataState, Empty, Progress, Skeleton, Spinner } from '@sdcorejs/nova/data-state';
import { Field, FormErrors, Label, focusFirstInvalid } from '@sdcorejs/nova/field';
import { en, vi, type NovaStringOverrides, type NovaStrings } from '@sdcorejs/nova/i18n';
import { Input, InputGroup, Textarea } from '@sdcorejs/nova/input';
import { Link } from '@sdcorejs/nova/link';
import { RadioGroup } from '@sdcorejs/nova/radio-group';
import { Switch } from '@sdcorejs/nova/switch';
import { NovaProvider, ThemeProvider, useNovaTheme } from '@sdcorejs/nova/theme';
import type { AccessibleName, ControlProps, Key, SurfaceProps, ValueProps } from '@sdcorejs/nova/types';

// ---------------------------------------------------------------- positives
const buttonRef = createRef<HTMLButtonElement>();
const elementRef = createRef<HTMLElement>();
const inputRef = createRef<HTMLInputElement>();
const textareaRef = createRef<HTMLTextAreaElement>();
const crumbs: BreadcrumbItem[] = [{ id: 'home', label: 'Trang chủ', href: '/' }, { id: 'here', label: 'Đây' }];
const catalog: NovaStrings = vi satisfies NovaStrings;
const overrides: NovaStringOverrides = { feedback: { retry: en.feedback.retry } };
const keys: Key[] = [0, 'a'];
const surface: SurfaceProps = { className: 'x', 'data-testid': 't' };
const named: AccessibleName = { 'aria-label': 'x' };
const control: ControlProps = { nameFromField: true };
const value: ValueProps<string> = { value: '', onValueChange: () => {} };
const focused: HTMLElement | null = focusFirstInvalid(document.body);

export function Positives() {
  const { theme, resolvedTheme } = useNovaTheme();
  return (
    <NovaProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" dir="ltr" theme="system" initialResolvedTheme="dark" strings={overrides} portalContainer={null} className="brand">
      <ThemeProvider theme="dark" className="inner">
        <p>{theme}{resolvedTheme}{catalog.common.close}{keys.length}{String(focused)}{named['aria-label']}{String(control.nameFromField)}{value.value}{surface.className}</p>
        <Button ref={buttonRef} variant="secondary" size="lg" loading type="submit" render={(props, state) => <button {...props} data-loading={state.loading} />}>Lưu</Button>
        <IconButton label="Đóng" icon={<svg />} />
        <ButtonGroup label="Nhóm"><Button>A</Button></ButtonGroup>
        <Avatar name="An" src="/a.png" size="sm" decorative />
        <AvatarGroup label="Nhóm" max={2}><Avatar name="B" /></AvatarGroup>
        <Badge tone="success" icon={<svg />}>{0}</Badge>
        <CardGroup gap="lg"><Card><Section title="T" headingLevel={4} description="d" actions={<Button>x</Button>}><SectionItem>i</SectionItem></Section></Card></CardGroup>
        <Link href="/x" target="_blank" rel="nofollow">x</Link>
        <Breadcrumb items={crumbs} renderLink={(item) => <a href={item.href}>{item.label}</a>} label="Vị trí" />
        <Alert tone="tip" title="t" live="polite" onDismiss={() => {}} actions={<Button>a</Button>} aria-label="x">b</Alert>
        <DataState state="error" message="m" onRetry={() => {}} retryPending refreshing>{0}</DataState>
        <Empty title="e" description="d" actions={<Button>a</Button>} icon={<svg />} />
        <Skeleton shape="circle" />
        <Spinner label="l" size="sm" />
        <Progress label="p" value={null} max={10} />
        <Field id="f" label="Email" description="d" error="e" required>
          <Input nameFromField ref={inputRef} type="email" autoComplete="email" name="email" value="" onValueChange={() => {}} />
        </Field>
        <Label htmlFor="x" required>L</Label>
        <FormErrors errors={[{ id: 'e', message: 'm', fieldId: 'f' }]} />
        <InputGroup start="₫"><Input aria-label="Giá" defaultValue="1" /></InputGroup>
        <Textarea label="Ghi chú" ref={textareaRef} rows={4} resize="none" />
        <Checkbox label="A" value="mixed" onValueChange={(next: boolean | 'mixed') => next} ref={elementRef} inputRef={inputRef} submissionValue="yes" />
        <Switch aria-labelledby="h" defaultValue />
        <RadioGroup<1 | 's'> label="R" options={[{ value: 1, label: 'Một' }, { value: 's', label: 'S' }]} value={1} onValueChange={(next: 1 | 's' | null) => next} serializeValue={(key) => String(key)} />
      </ThemeProvider>
    </NovaProvider>
  );
}

// ---------------------------------------------------------------- negatives
// @ts-expect-error private helpers are not part of the public exports map
export * as privateLib from '@sdcorejs/nova/lib/cx';

// @ts-expect-error the private portal scope is not exported
export { PortalScope } from '@sdcorejs/nova/theme';

// @ts-expect-error DataState<T> (the data shape) is not exported in P0 (Q-04)
export type { DataState as DataShape } from '@sdcorejs/nova/types';

// @ts-expect-error theme is a closed union
export const badTheme = <NovaProvider theme="blue"><i /></NovaProvider>;

// @ts-expect-error useNovaTheme exposes no setter
export const useThemeSetter = () => useNovaTheme().setTheme;

// @ts-expect-error ThemeProvider requires theme
export const noTheme = <ThemeProvider><i /></ThemeProvider>;

// @ts-expect-error IconButton requires a label
export const iconNoLabel = <IconButton icon={<svg />} />;

// @ts-expect-error Button render must return an element for a native button
export const badRender = <Button render={() => 'text'}>x</Button>;

// @ts-expect-error ButtonGroup needs a name
export const groupNoName = <ButtonGroup><Button>A</Button></ButtonGroup>;

// @ts-expect-error Badge tone is a closed set
export const badTone = <Badge tone="danger">x</Badge>;

// @ts-expect-error Section headingLevel is 2 | 3 | 4
export const badHeading = <Section title="t" headingLevel={5}>x</Section>;

// @ts-expect-error Card has no title part (Q-11)
export const cardPart = <Card title="t">x</Card>;

// @ts-expect-error Link requires href
export const linkNoHref = <Link>x</Link>;

// @ts-expect-error BreadcrumbItem needs an id
export const crumbNoId = <Breadcrumb items={[{ label: 'x' }]} />;

// @ts-expect-error Alert live is off | polite | assertive
export const loudAlert = <Alert live="loud" title="t" />;

// @ts-expect-error DataState state is a closed set
export const doneState = <DataState state="done" />;

// @ts-expect-error Progress requires a label
export const progressNoLabel = <Progress value={1} />;

// @ts-expect-error Field requires a label
export const fieldNoLabel = <Field><i /></Field>;

// @ts-expect-error FormErrors entries need an id
export const errorNoId = <FormErrors errors={[{ message: 'm' }]} />;

// @ts-expect-error Input needs a naming source
export const inputUnnamed = <Input />;

// @ts-expect-error Input label and aria-label are exclusive
export const inputDoubleName = <Input label="a" aria-label="a" />;

// @ts-expect-error nameFromField takes description from the Field
export const inputFieldDescription = <Input nameFromField description="d" />;

// @ts-expect-error controlled Input requires onValueChange
export const inputControlledNoCallback = <Input aria-label="x" value="v" />;

// @ts-expect-error Input type is a closed set (no number/date in P0)
export const inputNumber = <Input aria-label="x" type="number" />;

// @ts-expect-error Input value is a string
export const inputNumericValue = <Input aria-label="x" defaultValue={1} />;

// @ts-expect-error Textarea ref is an HTMLTextAreaElement
export const textareaWrongRef = <Textarea aria-label="x" ref={inputRef} />;

// @ts-expect-error InputGroup wraps exactly one element
export const groupText = <InputGroup>text</InputGroup>;

// @ts-expect-error Switch does not accept 'mixed'
export const mixedSwitch = <Switch label="s" value="mixed" onValueChange={() => {}} />;

// @ts-expect-error Checkbox inputRef targets the hidden input
export const checkboxWrongInputRef = <Checkbox label="c" inputRef={buttonRef} />;

// @ts-expect-error RadioGroup keys are string | number only
export const objectKey = <RadioGroup label="r" options={[{ value: { id: 1 }, label: 'x' }]} />;

// @ts-expect-error RadioGroup value matches the option key type
export const wrongKeyType = <RadioGroup<number> label="r" options={[{ value: 1, label: 'x' }]} value="1" onValueChange={() => {}} />;

// @ts-expect-error vi must satisfy every NovaStrings namespace
export const partialCatalog: NovaStrings = { common: vi.common };
