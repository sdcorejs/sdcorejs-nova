# Nova P1 — hợp đồng API và tích hợp

Đối chiếu nền P0 tại commit `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`. P1 gồm 26 dossier và 80 acceptance criteria trong [chỉ mục](README.md), đã có source local, public declarations và showcase VI/EN. Đây chưa phải bản đã merge hoặc phát hành. Các chữ ký bên dưới mô tả contract; declarations trong package build là nguồn chính xác cho generic/union đầy đủ. Phần kiểm chứng và giới hạn nghiệm thu nằm trong [plan P1](p1-plan.vi.md).

## Hợp đồng dùng chung

Import types React tương ứng và các types P0 `ValueProps`, `ControlProps`, `SurfaceProps`, `Key`, `Action`, `MenuAction`, `LoadContext`. Types/hooks bên dưới có public entry; import từ root hoặc subpath core, adapters chỉ từ subpath riêng. `ControlProps` P0 giữ AccessibleName union và ownership của Field: `nameFromField` không được ghi đè description/error/required. `P1InputProps = Omit<NativeInputProps, 'aria-invalid' | 'aria-required' | 'role' | 'children'>` giữ native form/autoComplete/inputMode/handlers, không collapse ControlProps union; managed value/defaultValue/onChange/type/accessible-name đã được NativeInputProps P0 loại. External native handlers được compose, preventDefault được giữ khi thích hợp. `ref` luôn trỏ semantic control hoặc focus target được mô tả, không div trang trí. Generic raw T không bị stringify hoặc suy domain keys.

Control dùng `ValueProps` giữ mode tại mount, callback đề xuất value, controlled UI đợi prop; defaultValue chỉ initialize một lần. Không chuyển mode; invalid JS runtime có diagnostic. Ngoại lệ controlled-only được nói rõ ở F16. Loading khác disabled; readOnly giữ focus/copy nhưng không mutate. Native form name/ref/onBlur/required/disabled và reset được kiểm tra; không bọc button trong button.

Native form payload policy (không serialize raw T):

| Control | FormData |
|---|---|
| Text/InlineText/Autocomplete | Raw input string |
| NumberInput | Finite canonical numeric string, 0 giữ; null omitted |
| Select/Combobox | P0 key encoding `n:<number>` / `s:<string>`, null omitted; query không submit riêng |
| MultiSelect/ChipInput | Repeated name theo array order; MultiSelect key encoding, ChipInput raw item strings/draft không submit |
| SegmentedControl | Single hoặc repeated name cho multi; `n:`/`s:` và `b:true`/`b:false` cho boolean; null omitted |
| DatePicker/TimeInput/DateTimePicker | Civil ISODate/LocalTime hoặc normalized UTC instant; null omitted |
| DateRangePicker/TimeRangeInput | Explicit names.start/names.end, scalar name forbidden; mỗi non-null endpoint submit riêng, không JSON |

No name => no submission; disabled => omitted, readOnly vẫn submit. Composite hidden submission input và query/draft không duplicate payload. External form association tới actual submission control; Enter native submit không intercept nghiệp vụ. Uncontrolled reset về initial default, callback khi value đổi; controlled reset do consumer form onReset cập nhật props, Nova không mutate/emit giả prop. Cancelled reset event không đổi value. F16 ref là actual selected/first enabled button, không wrapper. Native composition/caret/blur/autoComplete/inputMode và range child naming có type/runtime fixtures.

Provider/hook state theo instance/root, không share request/module singleton. SSR/import không đọc browser globals; portal mount sau hydration, useId cho ARIA. Async read latest-wins; mutation không tự retry; abort local không hứa remote rollback. Error raw chỉ tới callback consumer, UI dùng safe localized message. Các callback P0 không có signal không bị đổi chữ ký ngầm.

Portal kế thừa current Nova context: theme/locale/dir/token classes của scope hiện tại và portalContainer. Không hứa copy arbitrary inline CSS variables hoặc mọi ancestor class: override cho portal phải đặt bằng token class thuộc current scope. Nested ThemeProvider và explicit container phải được kiểm chứng. Không global reset/Tailwind runtime/font/icon dependency mới; dùng compiled CSS layers và tokens P0.

Mobile controls/action hit area ít nhất 44 × 44 px, input 16 px, safe-area/reflow; keyboard focus rõ và khác selected/hover. Light/dark, RTL, reduced motion, forced colors và text contrast là nghĩa vụ kiểm chứng. Aesthetic preview không thay semantic/manual accessibility evidence.

## S02 — Formatter và i18n

Dossier nền: [S02](specs/S02.vi.md). Dependencies P1: không.

```ts
useFormatter(options?: {timeZone?: string}): {number(value: number, options?: Intl.NumberFormatOptions): string; date(value: ISODate): string; instant(value: ISOInstant, options?: Intl.DateTimeFormatOptions): string};
formatRelative(value: ISOInstant, options: {locale: string; now: ISOInstant; unit?: 'second' | 'minute' | 'hour' | 'day' | 'week'}): string;
useRelativeTime(value: ISOInstant, options: {now: ISOInstant; unit?: 'second' | 'minute' | 'hour' | 'day' | 'week'; live?: boolean; intervalMs?: number}): string;
```

Giữ nguyên NovaStrings/NovaStringOverrides P0: thêm key string hoặc PluralEntry vào namespace hiện có, không đổi strings thành functions. Hook nhận locale/timeZone từ NovaProvider (UTC mặc định); options override rõ ràng. Date-only không đổi ngày do timezone; NaN/Infinity và temporal không hợp lệ trả unavailable localized. Relative formatting là pure function, now explicit; units elapsed fixed-duration, không calendar month/year. useRelativeTime server/first-client cùng now, live default false. live=true mới đọc clock sau mount, timer intervalMs default 60000, positive finite; cleanup khi live/props/unmount đổi. useFormatter không auto ticker. Không SafeHTML.

## S08 — Viewport và media query

Dossier nền: [S08](specs/S08.vi.md). Dependencies P1: không.

```ts
useMediaQuery(query: string, options?: {serverMatch?: boolean; ownerWindow?: Window | null}): boolean;
useViewport(options?: {serverWidth?: number; serverHeight?: number; ownerWindow?: Window | null}): {width: number | undefined; height: number | undefined};
```

CSS là lựa chọn đầu cho presentation. useSyncExternalStore giữ cùng server/first-client snapshot; ownerWindow chỉ được dùng sau hydration, mặc định window của consumer tại client. Width 0 khác undefined. Listener/RAF theo instance hoặc ownerWindow đã đăng ký; unsubscribe xóa hết khi ownerWindow đổi/unmount. Không UA sniff hoặc global mutable request store.

## S05 — Async action và BusyBoundary

Dossier nền: [S05](specs/S05.vi.md). Dependencies P1: không.

```ts
useAsyncAction<A extends readonly unknown[], R>(action: (ctx: LoadContext, ...args: A) => Promise<R>): {run(...args: A): Promise<R>; pending: boolean; error: unknown; cancel(): void};
class ActionInProgressError extends Error {readonly code: 'ACTION_IN_PROGRESS'}
type BusyBoundaryProps = SurfaceProps & {busy: boolean; label: string; children: ReactNode; mode?: 'indicator' | 'block'};
```

Một invocation đang pending thì invocation khác (cùng hoặc khác args) reject ActionInProgressError. Cancel/unmount race phải settle caller bằng AbortError ngay cả khi adapter bỏ qua signal; late rejection được consume, generation cũ không đổi state mới. Không chạy action trong effect, tự retry, global loading overlay hay toast. BusyBoundary indicator giữ content; block thể hiện aria-busy, consumer vô hiệu hóa actions cụ thể, không overlay vô hình chặn focus.

## C18 — Highlight an toàn

Dossier nền: [C18](specs/C18.vi.md). Dependencies P1: không.

```ts
type HighlightProps = SurfaceProps & {text: string | number | null | undefined; term: string | null | undefined};
findHighlightRanges(text: string, term: string): readonly {start: number; end: number}[];
```

Range là UTF-16 offsets của original text, giữ grapheme và dấu; case/accent insensitive gồm Đ/đ. Chỉ text nodes + mark, không HTML/parser từ user. Empty term không mark; 0 được giữ. Range không overlap, thuật toán không user regex/backtracking. Forced-colors và SR giữ câu tự nhiên.

## C15 — ReadOnlyValue và View

Dossier nền: [C15](specs/C15.vi.md). Dependencies P1: S02.

```ts
type ReadOnlyValueProps<T> = SurfaceProps & {value: T; display: ReactNode; label?: ReactNode; href?: string; renderValue?: (raw: T) => ReactNode};
type ViewProps<T> = SurfaceProps & {label: ReactNode; value: T; display: ReactNode; renderValue?: (raw: T) => ReactNode};
```

View là semantic label/value pair; ReadOnlyValue là value face dùng riêng hoặc bên trong View. Không giả disabled input, fetch hay stringify object. Render nhận đúng raw T; 0/false khác null/undefined/empty. Link dùng safe-href policy P0. InlineEdit thuộc F12, không phải C23. Slots và collection layout do consumer sở hữu.

## F15 — InlineText

Dossier nền: [F15](specs/F15.vi.md). Dependencies P1: không.

```ts
type InlineTextProps = ValueProps<string> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; minChars?: number; chrome?: 'standalone' | 'seamless'; clearable?: boolean; onEnter?: () => void; onEscape?: () => void};
```

Native input, raw string; minChars mặc định 2 chỉ quyết định visual size, không giới hạn nội dung. Controlled/uncontrolled giữ caret, defaultValue chỉ mount. Composition Enter không commit; Escape chỉ callback; clear emit empty string một lần, giữ focus. Seamless có focus ring ownership rõ; không hidden measurement DOM.

## C11 — Dialog, Sheet và Drawer

Dossier nền: [C11](specs/C11.vi.md). Dependencies P1: không.

```ts
type CloseReason = 'escape' | 'outside' | 'action';
type DialogProps = ValueProps<boolean> & SurfaceProps & {title: ReactNode; description?: ReactNode; children: ReactNode; modal?: boolean; initialFocusRef?: RefObject<HTMLElement | null>; returnFocusRef?: RefObject<HTMLElement | null>; onCloseRequest?: (reason: CloseReason) => boolean | void; closeDisabled?: boolean};
type SheetProps = DialogProps & {side?: 'start' | 'end' | 'bottom'; size?: 'sm' | 'md' | 'lg'};
type DrawerProps = SheetProps;
```

Drawer là named entry cùng Sheet semantics, không controller hoặc store thứ hai. Boolean false từ onCloseRequest veto request đồng bộ; closeDisabled chặn cả ba close requests, consumer vẫn có thể cập nhật controlled value. Callback chỉ đề xuất value=false; cleanup/focus return xảy ra khi state thực sự đóng. Base UI quản lý trap/inert/scroll-lock/nested top overlay; private PortalScope sở hữu một portal host, không double portal. Nonmodal không trap/inert; initial focus chỉ explicit, return focus khi action close. SSR/first hydration không mount overlay; default open mount sau hydration. Trigger mất thì chọn visible fallback có chủ đích; không focus body ngẫu nhiên.

## C12 — Popover và Tooltip

Dossier nền: [C12](specs/C12.vi.md). Dependencies P1: C11.

```ts
type PopoverProps = ValueProps<boolean> & SurfaceProps & {trigger: ReactElement; children: ReactNode; placement?: 'top' | 'bottom' | 'start' | 'end'; label: string; initialFocusRef?: RefObject<HTMLElement | null>; returnFocusRef?: RefObject<HTMLElement | null>; disabled?: boolean};
type TooltipProps = {content: string; children: ReactElement; delayMs?: number; disabled?: boolean};
```

Trigger là một element không lồng interactive elements; disabled không mở. Popover nonmodal, content named, outside/Escape đóng và return focus thích hợp. Positioner flip/shift/reposition theo viewport và scrolling ancestor; portal context giống current Nova scope. Tooltip không interactive, không thay accessible name; focus/hover duy trì không timeout, hover gap được nối; Escape ẩn đến transition focus/hover mới. Essential help trên touch được consumer đặt inline, không bắt long-press.

## C17 — Accordion và CollapsibleSection

Dossier nền: [C17](specs/C17.vi.md). Dependencies P1: không.

```ts
type CollapsibleSectionProps = ValueProps<boolean> & SurfaceProps & {title: ReactNode; headingLevel?: 2 | 3 | 4 | 5 | 6; children: ReactNode; actions?: ReactNode; disabled?: boolean; keepMounted?: boolean};
type AccordionProps = ValueProps<readonly string[]> & SurfaceProps & {multiple?: boolean; children: ReactNode};
type AccordionItemProps = SurfaceProps & {value: string; title: ReactNode; children: ReactNode; disabled?: boolean; actions?: ReactNode; headingLevel?: 2 | 3 | 4 | 5 | 6; keepMounted?: boolean};
```

ID/value ổn định khi reorder; single mode tối đa một item. Header là heading chứa button, actions là siblings không nested button và không toggle khi click. Unmount mặc định; keepMounted hidden + inert, không tab-stop. Nếu focus nằm trong panel đang đóng thì đưa về header trước khi hide. useId SSR, không module counter. Không cần portal hay service cho accordion.

## C02 — ActionMenu và QuickActions

Dossier nền: [C02](specs/C02.vi.md). Dependencies P1: C11, C12, S05.

```ts
type ActionMenuProps<T> = SurfaceProps & {data: T; actions: readonly MenuAction<T>[]; label: string; disabled?: boolean; onActionError?: (error: unknown, actionId: string) => void};
type QuickActionsProps<T> = ActionMenuProps<T>;
```

Giữ Action<T>/MenuAction<T> P0: leaf callback nhận đúng raw T; children chỉ một cấp, deeper nesting bị type reject và runtime diagnostic. QuickActions là cùng menu contract với trigger compact; không CRUD mặc định. Hidden lọc; disabled vẫn thấy, không execute; all-hidden không trigger rỗng. Menu keyboard/typeahead và RTL do Base UI. Async item giữ menu/focus tới outcome, singleflight chống Enter lặp; rejection giữ menu cho retry, raw error chỉ qua consumer callback. Callback P0 không nhận signal: Nova không tuyên bố cancel remote action; unmount chỉ ignore/consume late result, consumer có thể compose useAsyncAction.

## C07 — Tabs và TabPanel

Dossier nền: [C07](specs/C07.vi.md). Dependencies P1: không.

```ts
type TabsProps = ValueProps<string> & SurfaceProps & {activationMode?: 'automatic' | 'manual'; orientation?: 'horizontal' | 'vertical'; children: ReactNode};
type TabListProps = SurfaceProps & {label: string; children: ReactNode};
type TabProps = SurfaceProps & {value: string; disabled?: boolean; children: ReactNode};
type TabPanelProps = SurfaceProps & {value: string; keepMounted?: boolean; children: ReactNode};
```

Parts cùng Tabs context, value/IDs ổn định; controls/labelledby đúng panel. Roving arrows/Home/End bỏ disabled; manual chỉ Enter/Space activate. Controlled đợi prop, không callback trong render. Invalid value dùng first enabled visual fallback + diagnostic, không emit ngầm. Panel mặc định mount khi active; keepMounted hidden/inert, cleanup callbacks thuộc child. Không router hoặc storage.

## C08 — Stepper

Dossier nền: [C08](specs/C08.vi.md). Dependencies P1: không.

```ts
type Step = {id: string; label: string; status?: 'pending' | 'complete' | 'error'; disabled?: boolean};
type StepperProps = ValueProps<string> & SurfaceProps & {steps: readonly Step[]; interactive?: boolean; label?: string};
```

Noninteractive dùng ol + aria-current=step, không buttons. Interactive chỉ đề xuất chọn step, không validate/save/advance. Error có text/icon, không color-only. Reorder theo ID; zero steps là empty list, không invented current callback. Narrow chuyển vertical, long Vietnamese/zoom không truncate quan trọng.

## F16 — SegmentedControl

Dossier nền: [F16](specs/F16.vi.md). Dependencies P1: không.

```ts
type SegmentValue = string | number | boolean;
type SegmentOption<V extends SegmentValue> = {value: V; label: string; icon?: ReactNode; disabled?: boolean};
type SegmentedControlProps<V extends SegmentValue> = ControlProps & SurfaceProps & {ref?: Ref<HTMLButtonElement>; form?: string; items: readonly SegmentOption<V>[]; variant?: 'light' | 'fill' | 'outline'; orientation?: 'horizontal' | 'vertical'; stretch?: boolean} & ({multiple?: false; value: V | null; onValueChange: (value: V | null) => void; allowEmpty?: boolean} | {multiple: true; value: readonly V[]; onValueChange: (value: readonly V[]) => void; allowEmpty?: never});
```

Controlled-only collection, không thêm uncontrolled giả. Single radio semantics: arrows chọn ngay, active repeat click không clear; allowEmpty thêm explicit clear button. Multi aria-pressed: arrows chỉ focus, Space/Enter toggle, fresh array theo items order. 0/false keys hợp lệ, duplicates so theo type+value. Icons decorative, text labels có name; không tabs role. Root Field owner/group ref focus actual first enabled control.

## C16 — AnchorNavigation và AnchorSection

Dossier nền: [C16](specs/C16.vi.md). Dependencies P1: S08.

```ts
type AnchorItem = {id: string; title: string};
type ActiveAnchorProps = {activeId: string | null; defaultActiveId?: never; onActiveIdChange: (id: string | null) => void} | {activeId?: never; defaultActiveId?: string | null; onActiveIdChange?: (id: string | null) => void};
type AnchorNavigationProps = ActiveAnchorProps & SurfaceProps & {items: readonly AnchorItem[]; label: string; scrollRootRef?: RefObject<HTMLElement | null>; offsetPx?: number; updateHash?: boolean};
type AnchorSectionProps = SurfaceProps & {id: string; title: ReactNode; headingLevel?: 2 | 3 | 4; children: ReactNode};
```

href #id có nghĩa khi JS unavailable; enhanced click scroll/focus heading sau offset. updateHash mặc định false để không phá consumer hash-router; scrollspy không spam history. Observer sau mount, cleanup khi root/sections đổi; duplicate/missing ID diagnostic. Controlled active callback đợi prop; reduced motion instant. CSS presentation không phụ thuộc viewport hook khi không cần.

## S10 — Clipboard, CopyButton và ScrollArea

Dossier nền: [S10](specs/S10.vi.md). Dependencies P1: C12.

```ts
useClipboard(): {copy(text: string): Promise<boolean>; pending: boolean; errorMessage?: string};
type CopyButtonProps = SurfaceProps & {text: string; label?: string};
type ScrollAreaProps = SurfaceProps & {label?: string; children: ReactNode; maxHeight?: string};
```

Clipboard chỉ event user gesture; permission denied resolve false + safe localized status, không uncaught rejection/hover side-effect. Khi pending, copy thứ hai (cùng/khác text) resolve false ngay, không dùng success của text đầu cho text chưa copy; unmount settle local wait false và consume late rejection, không hứa abort browser write. Timer cleanup. ScrollArea native overflow; focusable named region chỉ khi overflow có ý nghĩa, không empty tab-stop. maxHeight là consumer-authored CSS value, nếu supplied mới áp root inline max-height; không supplied thì stylesheet quyết định. Dynamic positioning của Base UI và consumer style/maxHeight có CSP style-attribute nghĩa vụ riêng, không hứa strict CSP-B zero reports. Text selectable fallback, keyboard/touch đúng; không navigator ở SSR/import.

## S03 — ToastProvider và useToast

Dossier nền: [S03](specs/S03.vi.md). Dependencies P1: C11, S05.

```ts
type ToastInput = {id?: string; tone?: 'info' | 'success' | 'warning' | 'error'; title: string; description?: string; durationMs?: number | null; announcement?: 'polite' | 'assertive'; action?: {label: string; onAction: (ctx: LoadContext) => void | Promise<void>}};
type ToastProviderProps = {children: ReactNode; maxVisible?: number; offset?: string; onActionError?: (error: unknown, id: string) => string | void};
useToast(): {show(input: ToastInput): string; update(id: string, patch: Partial<Omit<ToastInput, 'id'>>): boolean; dismiss(id: string): boolean};
```

Provider lấy nearest NovaScope at provider boundary, không per-invoker nested scope; context updates propagate, muốn nested theme/locale/container khác thì nest ToastProvider. Root-local queue, default maxVisible=5 theo AC, positive finite config; không arbitrary total queue cap. Same ID update existing/queued, unknown hoặc dismissed update=false không resurrect. Default info/success 5000 ms; persistent null. Pause lưu remaining duration (không restart) khi hover/focus/document hidden; duration patch explicit mới reset. Assertive opt-in, meaningful update announce một lần. Action signal/pending once; error an toàn giữ toast, dismiss/unmount abort/ignore late. Portal current scope, mobile safe-area + offset và close/action hit area 44 px. Missing provider rõ configuration error, SSR không auto-create toast/timer.

## S04 — ConfirmProvider và useConfirm

Dossier nền: [S04](specs/S04.vi.md). Dependencies P1: C11.

```ts
type ConfirmOptions = {title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: 'neutral' | 'danger'; signal?: AbortSignal};
type ConfirmResult = 'confirmed' | 'cancelled';
type ConfirmProviderProps = {children: ReactNode};
useConfirm(): (options: ConfirmOptions) => Promise<ConfirmResult>;
```

Provider lấy nearest NovaScope at provider boundary, không per-invoker theme/locale/container; context updates propagate, nested ConfirmProvider mới có nested scope. Root-local FIFO, không title-based dedupe. Danger focus Cancel; confirm chỉ explicit action, Escape/outside=>cancelled. Signal/unmount settle mọi request một lần, abort queued không bao giờ show. SSR event API invocation cancelled + diagnostic, không pending mãi. Missing provider throw configuration error. Provider chỉ UI decision, consumer mới chạy destructive callback; AlertDialog primitive có explicit outside-cancel handler theo contract, không implicit destructive action.

## F03 — NumberInput

Dossier nền: [F03](specs/F03.vi.md). Dependencies P1: S02.

```ts
type NumberInputProps = ValueProps<number | null> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; min?: number; max?: number; step?: number; locale?: string; onDraftChange?: (draft: string) => void};
```

Base UI NumberField + native editable draft: '-', decimal separator và IME chưa emit invalid number. Valid finite commit only, empty=>null; invalid giữ draft/error/last valid, không NaN/Infinity hoặc silent blur clamp. Locale parser vi/en reject ambiguous separators; arrows step/bounds, wheel không đổi giá trị khi user scroll page. Money decimal/string adapter do consumer, không tự coi number là exact currency.

## F07 — Select, Combobox và Autocomplete

Dossier nền: [F07](specs/F07.vi.md). Dependencies P1: C12.

```ts
type Option<T, K extends Key> = {key: K; label: string; data: T; disabled?: boolean};
type SelectProps<T, K extends Key> = ValueProps<K | null> & ControlProps & {form?: string; ref?: Ref<HTMLButtonElement>; options: readonly Option<T, K>[]; renderOption?: (raw: T) => ReactNode; loading?: boolean; unresolvedLabel?: (key: K) => string; clearable?: boolean};
type QueryProps = {query: string; defaultQuery?: never; onQueryChange: (query: string) => void} | {query?: never; defaultQuery?: string; onQueryChange?: (query: string) => void};
type ComboboxProps<T, K extends Key> = ValueProps<K | null> & ControlProps & P1InputProps & QueryProps & {ref?: Ref<HTMLInputElement>; options: readonly Option<T, K>[]; renderOption?: (raw: T) => ReactNode; loading?: boolean; unresolvedLabel?: (key: K) => string; clearable?: boolean};
type AutocompleteProps = ValueProps<string> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; suggestions: readonly string[]; loading?: boolean};
```

Keys distinct raw T objects, duplicates diagnostic; selected key absent giữ value và unresolved label fallback localized, không silently drop. Clear=>null; disabled options skip. External query/options latest-wins thuộc consumer data owner, không fetch. IME không premature filter/commit. Loading/status/no results tách Field error, Autocomplete free text không forced key. One Field owner, Select label htmlFor actual trigger; combo aria-activedescendant/input ref và Escape giữ prior selection.

## F08 — MultiSelect và ChipInput

Dossier nền: [F08](specs/F08.vi.md). Dependencies P1: F07.

```ts
type MultiSelectProps<T, K extends Key> = ValueProps<readonly K[]> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; options: readonly Option<T, K>[]; renderOption?: (raw: T) => ReactNode; maxSelected?: number; loading?: boolean};
type ChipInputProps = ValueProps<readonly string[]> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; maxItems?: number; normalize?: (text: string) => string; validate?: (text: string) => string | undefined};
```

Không default business item cap. Max consumer explicit; raw T slots và immutable ordered arrays. IME Enter không add; normalized duplicate/invalid có error. Disabled selected vẫn visible không remove; readOnly không delete. Named remove button; Backspace draft empty focus chip trước removal, giữ focus reachable. Wrap/reflow, overflow +N có accessible complete list và không mất dữ liệu.

## F09 — DatePicker, DateRangePicker và Calendar

Dossier nền: [F09](specs/F09.vi.md). Dependencies P1: C12, S02.

```ts
type ISODate = string; // strict YYYY-MM-DD; Gregorian years 0001..9999
type DateRange = {start: ISODate | null; end: ISODate | null};
type CalendarBase = {referenceDate: ISODate; min?: ISODate; max?: ISODate; isDateDisabled?: (date: ISODate) => boolean; weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; initialMonth?: string};
type CalendarProps = ValueProps<ISODate | null> & CalendarBase & SurfaceProps & {label: string};
type DatePickerProps = ValueProps<ISODate | null> & CalendarBase & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>};
type DateRangePickerProps = ValueProps<DateRange> & CalendarBase & ControlProps & {name?: never; names?: {start: string; end: string}; form?: string; ref?: Ref<HTMLInputElement>};
```

Nova sở hữu Gregorian calendar grid; Base UI không cung cấp Calendar. referenceDate bắt buộc, consumer truyền cùng snapshot server/client; initialMonth YYYY-MM valid, fallback selected month rồi referenceDate, không Date.now hoặc machine zone. vi Monday/en Sunday default, explicit weekStartsOn override; localized full cell date/name/state, selected/today(referenceDate)/disabled. Date-only civil parser, typed vi dd/MM/yyyy, no Date(local midnight). Arrows logical RTL/day/week, Home/End theo weekStart, PageUp/Down clamp đúng month end; Escape return input. One Field owner cho range group, hai individually named inputs không duplicate nameFromField; ref focus first input. Partial range explicit nulls, end<start error không swap; typing/picker đều respect disabled/min/max. Disabled range policy endpoints-only: hai endpoint phải selectable, interior disabled days không tự cấm khoảng; consumer range validator quyết định unavailable interior/business rules. Grid một roving tab-stop; disabled dates dùng aria-disabled vẫn focus để đọc, Enter/Space không select. All-disabled month giữ reference/clamped date focus hoặc heading fallback, month navigation và Close còn reachable; month change announce polite localized một lần. Mobile một tháng; tại viewport 320–375 px calendar popup dùng full-width bottom sheet, tổng horizontal inset/border tối đa 12 px để 7 cột ×44 px =308 px, gap 0; hit targets không overlap hoặc page overflow. Larger popup theo margins chuẩn, safe-area và long labels.

## F10 — TimeInput, TimeRangeInput và DateTimePicker

Dossier nền: [F10](specs/F10.vi.md). Dependencies P1: F09, S02.

```ts
type LocalTime = string; // strict HH:mm or HH:mm:ss; no 24:00
type ISOInstant = string; // explicit Z or numeric UTC offset, normalize to UTC Z
type TimeInputProps = ValueProps<LocalTime | null> & ControlProps & P1InputProps & {ref?: Ref<HTMLInputElement>; precision?: 'minute' | 'second'; min?: LocalTime; max?: LocalTime};
type TimeRangeInputProps = ValueProps<{start: LocalTime | null; end: LocalTime | null}> & ControlProps & {name?: never; names?: {start: string; end: string}; form?: string; ref?: Ref<HTMLInputElement>; allowOvernight?: boolean};
type WallTimeResult = {status: 'resolved'; instant: ISOInstant} | {status: 'invalid'; reason: 'gap' | 'ambiguous' | 'invalid-date' | 'invalid-time' | 'invalid-zone'};
type DateTimeAdapter = {resolve(input: {date: ISODate; time: LocalTime; timeZone: string; disambiguation: 'reject' | 'earlier' | 'later'}): WallTimeResult};
type DateTimePickerProps = ValueProps<ISOInstant | null> & ControlProps & CalendarBase & {form?: string; ref?: Ref<HTMLInputElement>; timeZone: string; adapter: DateTimeAdapter; disambiguation?: 'reject' | 'earlier' | 'later'};
createTemporalAdapter(): DateTimeAdapter; // only ./adapters/temporal
```

LocalTime không epoch. DateTimePicker nhận explicit converter, không service locator/global polyfill; shipped createTemporalAdapter từ optional ./adapters/temporal. Default reject cả gap/overlap; earlier/later chỉ resolve overlap, gap luôn error (adapter roundtrip wall date/time để không chấp nhận Temporal gap shifting). Offset-less instant rejected; value normalized UTC Z, display explicit zone, đổi zone giữ instant. TimeRange overnight false default, true có hôm sau; equal zero duration. Range/date-time là một Field owner với individually named controls; native text/numeric keyboard, không spinner-only. Temporal chỉ converter, civil Calendar/basic formats không import engine.

## F12 — InlineEdit và controlled commit

Dossier nền: [F12](specs/F12.vi.md). Dependencies P1: C15, F15, S05.

```ts
type Revision = string | number;
type InlineEditCommit<T> = {value: T; revision: Revision};
type InlineEditProps<T> = SurfaceProps & {value: T; revision: Revision; scopeKey: string; display: ReactNode; label: string; disabled?: boolean; isEqual?: (a: T, b: T) => boolean; renderEditor: (args: {draft: T; setDraft(value: T): void; error?: string; conflict: boolean; awaitingAcknowledgement: boolean; resolveConflict(choice: 'reload' | 'rebase'): void}) => ReactNode; onSave: (draft: T, ctx: LoadContext & {baseRevision: Revision; scopeKey: string}) => Promise<InlineEditCommit<T>>; onCommit: (commit: InlineEditCommit<T>) => void; mapError?: (error: unknown) => string};
```

Display native edit button, Enter vào editor; explicit Save/Cancel, multiline Enter không save. Save singleflight giữ draft trên error. onSave resolve không tự close: onCommit đề xuất consumer update; chỉ close/focus face sau matching prop revision + value (isEqual default Object.is). Pending acknowledgement không gọi save lần nữa; consumer có thể giữ editor cho đến prop update, không timeout giả. Revision/scope khác lúc dirty báo conflict, block save; reload lấy current prop và bỏ draft, rebase giữ draft nhưng cập nhật base revision chỉ qua explicit consumer editor action. Revision hoặc value đổi trong lúc save pending phải invalidate generation + abort; old result/rejection được consume, không onCommit hoặc late focus. Chỉ sau accepted result mới nhận matching own expected acknowledgement; onSave không tự cập nhật parent props trước accepted result. Scope change/unmount/cancel trong pending cũng invalidate + abort local wait, không late onCommit/focus; backend có thể đã persist, không hứa rollback. Trước save, Cancel bỏ draft và focus face. Sau accepted persisted result, Cancel disabled trong awaiting acknowledgement, UI hiện đang đồng bộ; props mismatch sau đó thành conflict và explicit reload/rebase xử lý current authoritative value, không save lần hai tự động.

## F14 — Validation và RHF adapter

Dossier nền: [F14](specs/F14.vi.md). Dependencies P1: F03, F07, F08, F09, F10, F15, F16, S05.

```ts
type ValidationIssue<K extends string> = {field: K; message: string; code: string};
type ValidationResult<K extends string> = {status: 'validated'; issues: readonly ValidationIssue<K>[]} | {status: 'cancelled'; reason: 'cancelled' | 'superseded' | 'reset' | 'unmounted'} | {status: 'error'; message: string};
type Validator<T> = (values: Readonly<T>, ctx: LoadContext) => readonly ValidationIssue<Extract<keyof T, string>>[] | Promise<readonly ValidationIssue<Extract<keyof T, string>>[]>;
useFormValidation<T>(options: {validate: Validator<T>; createSnapshot: (values: T) => Readonly<T>; mapError?: (error: unknown) => string}): {validate(values: T): Promise<ValidationResult<Extract<keyof T, string>>>; pending: boolean; issues: readonly ValidationIssue<Extract<keyof T, string>>[]; cancel(): void; reset(): void};
useNovaController<TFields extends FieldValues, TName extends FieldPath<TFields>>(options: UseControllerProps<TFields, TName>): {name: TName; value: FieldPathValue<TFields, TName>; onValueChange(value: FieldPathValue<TFields, TName>): void; onBlur(): void; ref: RefCallback<HTMLElement>; disabled: boolean; error?: string};
```

Caller chỉ submit khi status=validated và issues.length=0. Cancel/superseded/reset/unmount không trả [] hoặc falsely valid; caller promises settle cả adapter ignore abort, late rejection consumed. createSnapshot explicit consumer immutable snapshot, không JSON serialize arbitrary T; touched/dirty/app save thuộc consumer. General safe error qua mapError hoặc localized fallback, không stack/HTML. RHF hook chỉ ./adapters/react-hook-form, không root reachability: value/onValueChange cho cả value controls lẫn boolean Checkbox/Switch P0; submissionValue là native form payload riêng, ref trỏ visible focus target và inputRef chỉ hidden submission input; name/ref/onBlur/errors/disabled map actual semantic input/trigger. Không FormGroup engine hay Zod dependency; native form submission và first-invalid focus được smoke trên packed consumer.

## C14 — AppShell, Sidebar và Navigation

Dossier nền: [C14](specs/C14.vi.md). Dependencies P1: C11, S08, C02.

```ts
type NavLink = {id: string; label: string; href: string; icon?: ReactNode; disabled?: boolean};
type NavItem = NavLink | {id: string; label: string; icon?: ReactNode; children: readonly NavLink[]};
type AppShellProps = SurfaceProps & {header?: ReactNode; sidebar?: ReactNode; children: ReactNode; mainId?: string; skipLabel?: string};
type MobileSidebarProps = {mobileValue: boolean; defaultMobileValue?: never; onMobileValueChange: (open: boolean) => void} | {mobileValue?: never; defaultMobileValue?: boolean; onMobileValueChange?: (open: boolean) => void};
type SidebarProps = ValueProps<boolean> & MobileSidebarProps & SurfaceProps & {label: string; children: ReactNode; triggerLabel?: string; returnFocusRef?: RefObject<HTMLElement | null>};
type NavigationProps = SurfaceProps & {label: string; items: readonly NavItem[]; currentId?: string | null; onNavigate?: (item: NavLink) => void; renderLink?: (args: {item: NavLink; current: boolean; linkProps: {href: string; 'aria-current'?: 'page'; onClick: (event: MouseEvent<HTMLElement>) => void}}) => ReactNode};
```

Desktop value là expanded/collapsed; mobileValue là drawer open, paired callback enforced bởi union khi supplied; defaultMobileValue initialize một lần, false nếu absent. Hai state không đồng nghĩa, page state không reset. Sidebar mobile dùng Drawer modal; crossing desktop breakpoint phải close/cleanup lock/inert, focus visible fallback nếu opener hidden, không chỉ CSS-hide open dialog. AppShell semantic header/nav/main, skip focus main không đổi hash route. Navigation currentId explicit, one-level children, native safe href; custom router renderer phải giữ semantics/handlers. Không tenant/auth filters hoặc router patch; consumer owns route. Showcase tích hợp thay consumer shell bằng public P1 composition mà giữ approved 232 px desktop/sidebar layout và current compact neutral menu, mobile44/focus tokens.

## S07 — UnsavedChanges và navigation adapter

Dossier nền: [S07](specs/S07.vi.md). Dependencies P1: C11, S05, F12.

```ts
type UnsavedOptions = {id: string; scopeKey: string; revision: string | number; dirty: boolean; save?: (ctx: LoadContext) => Promise<void>; discard?: (ctx: LoadContext) => void | Promise<void>};
type LeavePrompt = {scopeKey?: string; entries: readonly {id: string; canSave: boolean}[]; canSaveAll: boolean; signal: AbortSignal; phase: 'prompt' | 'saving' | 'awaitingAcknowledgement' | 'error'; errorMessage?: string; choose(decision: 'save' | 'discard' | 'stay'): void};
type UnsavedChangesProviderProps = {children: ReactNode; renderPrompt: (options: LeavePrompt) => ReactNode; mapError?: (error: unknown) => string; onError?: (error: unknown) => void};
useUnsavedChanges(options: UnsavedOptions): void;
useConfirmLeave(): (scopeKey?: string) => Promise<'leave' | 'stay'>;
```

Root-local registry, scoped coalesced prompt, writes serialize. Three choices qua renderPrompt Dialog adapter: provider owns active request/phase/choose lifecycle, consumer chỉ render UI; Escape/outside gọi choose(stay), unmount/abort=>stay, không binary ConfirmResult. choose(save/discard) khi busy không duplicate; choose(stay) vẫn abort local waits. Save chỉ khi mọi dirty entry có save; adapter trả save dù canSaveAll=false =>stay, không silently discard. Captured id/scope/revision/dirty snapshot rechecked sau await; new dirty entry, non-owned revision change khi còn dirty, hoặc entry bị bỏ khi còn dirty=>stay. Own successful save được acknowledge bởi same id/scope committed clean props, revision có thể advance; registry subscription đợi commit đó, không timeout/microtask polling hoặc immediate Promise-result false stay. Trong awaitingAcknowledgement prompt còn mở/busy; Stay/Escape abort=>stay. Consumer không ack thì không tự leave. Save failure giữ draft/error prompt, request không leave; user có thể Retry hoặc Stay; không auto-pristine. Dirty=false trước choice được reconcile khi cùng entry/scope và không có dirty mới. Discard chạy đúng entries một lần và reconcile thay đổi trước leave. Clean/no dirty=>leave; beforeunload listener chỉ khi dirty, browser generic message không guarantee mobile tab kill. Unregister/owner cleanup, không auto draft persistence/router patch/module singleton.

## Ví dụ UnsavedChanges với Dialog ba lựa chọn

Đây là composition consumer đề xuất, dùng public P1 APIs khi đã triển khai. Provider giữ request và busy/error state; adapter chỉ render UI và gọi choose. Stay luôn reachable khi saving/awaiting acknowledgement; Save/Discard không gửi lặp.

```tsx
function LeaveDialog({request}: {request: LeavePrompt}) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const busy = request.phase === 'saving' || request.phase === 'awaitingAcknowledgement';
  return <Dialog value={true} onValueChange={open => {if (!open) request.choose('stay')}}
    title="Thay đổi chưa lưu" description="Lưu thay đổi trước khi rời trang?"
    initialFocusRef={stayRef} onCloseRequest={() => {request.choose('stay'); return false}}>
    {request.errorMessage ? <Alert tone="error">{request.errorMessage}</Alert> : null}
    <Button disabled={busy || !request.canSaveAll} loading={busy}
      onClick={() => request.choose('save')}>Lưu</Button>
    <Button disabled={busy} onClick={() => request.choose('discard')}>Bỏ thay đổi</Button>
    <Button ref={stayRef} onClick={() => request.choose('stay')}>Ở lại</Button>
  </Dialog>;
}
<UnsavedChangesProvider renderPrompt={request => <LeaveDialog request={request} />}>
  <ProfileEditor />
</UnsavedChangesProvider>
```

ProfileEditor/app navigation sở hữu immutable draft, dirty/revision và save callback. Save resolve chưa là clean acknowledgement; committed hook registration update mới giải phóng request. Save thất bại giữ error prompt/draft, Stay settles caller và không navigation. Provider không tự gọi router hoặc nói backend đã rollback.

## Dependencies optional và licensing

Basic controls/calendar/formatting dùng React, native Intl và Base UI 1.8 đã có; không thêm mandatory runtime engine. Calendar là code Nova tự sở hữu, không tuyên bố Base UI Calendar tồn tại. Hai adapter được triển khai tại subpath: `./adapters/react-hook-form` và `./adapters/temporal`. Không root re-export/import hai adapters, không global polyfill.

Fixture versions đã pin: RHF `7.89.0`, Temporal polyfill `0.5.1`; optional peer ranges `~7.89.0` / `~0.5.1`, dev fixtures exact tương ứng. Manifest/lock đã cập nhật sau compatibility smoke từ package thật; optional peer metadata và root graph có gate riêng. RHF dùng [useController](https://react-hook-form.com/docs/usecontroller), upstream [package](https://raw.githubusercontent.com/react-hook-form/react-hook-form/master/package.json) và [MIT license](https://raw.githubusercontent.com/react-hook-form/react-hook-form/master/LICENSE). Temporal dùng [timezone semantics](https://tc39.es/proposal-temporal/docs/timezone.html), upstream [package](https://raw.githubusercontent.com/js-temporal/temporal-polyfill/main/package.json) và [ISC license](https://raw.githubusercontent.com/js-temporal/temporal-polyfill/main/LICENSE); có transitive `jsbi`, phải kiểm tra license/package fixture thực. Nguồn branch động chỉ xác nhận proposal hiện tại, không thay immutable package integrity/provenance khi adopt. Không gán Temporal MIT.

Smoke consumer không cài optional peers phải import root/basic forms được; adapter consumer đã cài peer phải hoạt động, declaration graph và bundle chứng minh không kéo optional engine vào root. Mọi upstream notice/provenance được giữ, static Pages artifact dùng inventory license từ build thực.

## Giới hạn và phần ngoài P1

Không auth/tenant/backend/cache/router interception/Angular DI. Không P2/P3 hoặc npm publication/version tags ở contract này. Avatar appearance đã được ghi nhận nhưng chưa giải quyết; không đưa repair avatar vào P1. [Kiến trúc](p1-architecture.vi.md) và [lộ trình kỹ thuật](p1-plan.vi.md) giải thích boundaries/verification; 80 AC nền vẫn được giữ nguyên IDs và nghĩa vụ chứng minh.

## Public entry P1 và ví dụ adapter

| Nhóm | Subpaths |
|---|---|
| Form | `number-input`, `select`, `multi-select`, `date-picker`, `time-input`, `date-time-picker`, `inline-text`, `inline-edit`, `segmented-control`, `form-validation` |
| Overlay/actions | `dialog`, `popover`, `action-menu`, `confirm`, `toast` |
| Shell/navigation | `app-shell`, `tabs`, `accordion`, `stepper`, `anchor-navigation` |
| Utilities | `formatter`, `viewport`, `async-action`, `busy-boundary`, `clipboard`, `copy-button`, `scroll-area`, `highlight`, `read-only-value`, `unsaved-changes` |
| Adapter optional | `adapters/react-hook-form`, `adapters/temporal` |

Mỗi subpath ở bảng có tiền tố `@sdcorejs/nova/`. Core cũng có named root exports. `select` chứa Select/Combobox/Autocomplete, `multi-select` chứa MultiSelect/ChipInput, `date-picker` chứa Calendar/DatePicker/DateRangePicker, `time-input` chứa TimeInput/TimeRangeInput. `dialog` chứa Dialog/Sheet/Drawer.

```tsx
'use client';
import {useForm} from 'react-hook-form';
import {Input} from '@sdcorejs/nova/input';
import {useNovaController} from '@sdcorejs/nova/adapters/react-hook-form';

export function Profile() {
  const {control, handleSubmit} = useForm({defaultValues: {name: ''}});
  const name = useNovaController({control, name: 'name', rules: {required: 'Nhập tên'}});
  return <form onSubmit={handleSubmit(values => console.info(values.name))}>
    <Input {...name} label="Tên" />
    <button type="submit">Gửi</button>
  </form>;
}
```

RHF ref trỏ visible control để focus first error. Adapter giữ raw value, không biến `null` thành chuỗi rỗng hoặc tự bỏ trạng thái `mixed` của Checkbox. Với boolean-only field, consumer ánh xạ `mixed` theo nghiệp vụ của mình.

```tsx
import {DateTimePicker} from '@sdcorejs/nova/date-time-picker';
import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';

const adapter = createTemporalAdapter();
export const appointment = <DateTimePicker label="Lịch hẹn"
  referenceDate="2024-03-10" timeZone="America/New_York" adapter={adapter}
  defaultValue="2024-03-10T06:30:00Z" />;
```

DateTimePicker không tự chọn múi giờ hoặc đoán offsetless instant. Khoảng DST không tồn tại bị từ chối; giờ trùng mặc định từ chối, chỉ resolve khi consumer chọn `earlier`/`later`.

Sidebar render inline trên server, rồi chuyển children sang stable portal host một lần sau hydration. Lần chuyển đầu có thể remount child; sau đó drawer open/close và breakpoint giữ local state/event ownership. Consumer cần dữ liệu phải sống xuyên hydration nên đặt state ở owner bên ngoài Sidebar.

Đã đối chiếu `@sdcorejs/utils`: Highlight cần range UTF-16 theo grapheme, date/time cần strict civil parsing và timezone policy, formatting dùng native Intl. Các utility hiện có không thay thế trực tiếp các contract này; P1 giữ mandatory dependency allowlist Base UI và không thêm dependency chỉ để tạo import.
