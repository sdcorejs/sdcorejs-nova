# SD Nova P0 — kiến trúc nền tảng

Tài liệu kỹ thuật kế thừa thiết kế P0 ngày 07/10/2026: API, ownership, SSR, CSS, CSP và các invariant. Chữ ký ở đây là tham chiếu thiết kế; source TypeScript và declarations của package là API kiểm chứng được. Xem [tích hợp P0](p0-integration.vi.md), [đề cương kiểm thử](p0-preparation.vi.md) và [showcase](showcase-pages.vi.md). Phần ngoài P0 vẫn là proposal.

## 2. Phạm vi

**Trong P0:** cấu hình package, tokens/theme, CSS biên dịch, exports/SSR/CSP smoke và 12 dossier S01, C01 (gồm `ButtonGroup`, `render`), C03, C04, C05 (không collapse), C06, C09, C10, F01, F02 (gồm `InputGroup`), F05, F06. Nút hiện mật khẩu là **mẫu composition của consumer** (`InputGroup` + `IconButton`), không phải component Nova.

**Ngoài P0:** mọi dossier P1–P3; overlay/portal công khai (C11/C12) — chỉ có nền portal **private** để test; toast (S03), formatter (S02), RHF adapter (F14), Section collapse (C17), Changesets/publish/release, CI workflow, dịch vụ nghiệp vụ, auth, data fetching.

## 3. Quyết định vật chất

**Kế thừa từ spec (không mở lại):** D-001 React; D-002 shadcn/ui là nguồn code/thiết kế, Base UI là nền interaction; D-003 thẩm mỹ neutral; D-008 không phụ thuộc Apps SDK UI, Ant Design, Angular. D-004 (một package, subpath exports), D-005 (React 19 trước), D-007 (CSS biên dịch, semantic variables) đang *recommended* trong spec và được dùng làm default; phần P0 dùng các conventions này. D-006 (TanStack Table) thuộc P2, hoãn.

**Các quyết định thiết kế P0:**

| ID | Quyết định | Lý do |
|---|---|---|
| D-009 | Style bằng **CSS thuần** `.nova-*` + selector `data-*` của Base UI; không Tailwind ở build lẫn runtime. Class Tailwind của shadcn được chuyển tay sang CSS Nova, mỗi bản copy ghi provenance. | Lựa chọn **đơn giản hóa có chủ ý**: token `--nova-*` tự định nghĩa dùng trực tiếp, không thêm generator, mỗi rule truy được nguồn, kiểm AST CSS đơn giản. Tailwind chỉ ở build *có thể* cấu hình không preflight và có scope; ta không chọn nó vì chi phí cấu hình/kiểm soát, không phải vì nó tất yếu vi phạm reset/scope. |
| D-010 | JS: `tsc` với `module`/`moduleResolution` `NodeNext`, phát ESM từng module + `.d.ts`, không bundle. Source **viết sẵn** specifier tương đối có đuôi `.js` (`'../../lib/cx.js'`), nên output là import hợp lệ với Node mà không dựa vào `rewriteRelativeImportExtensions`. CSS: Lightning CSS. | Giữ directive `'use client'` theo file và theo subpath; tree-shaking tự nhiên qua module riêng và `sideEffects`. Kiểm bằng test dist (import từng file trong Node, đọc directive). |
| D-011 | React 19: `ref` là prop thường, không `forwardRef`; peer `react`/`react-dom` `^19.0.0`. | Khớp `NativeInputProps.ref`; chủ ý chưa hỗ trợ React 18. |
| D-012 | Icon nội bộ là SVG inline `aria-hidden`; không gói icon. | Runtime dependency duy nhất là Base UI. |
| D-013 | Một nguồn token TypeScript sinh `tokens.css` **và** giá trị fallback light trong CSS component; test contrast chạy trên cùng nguồn. | Không lệch giữa tài liệu, CSS và fallback. |
| D-014 | Component thuần trình bày không hook/context, không `'use client'`: `Badge`, `Card`, `CardGroup`, `Section`, `SectionItem`, `Link`, `Empty`, `Skeleton`, `ButtonGroup`, `InputGroup`, `Label`. Còn lại là Client Component. | Dùng trực tiếp trong Server Component; root barrel không ép client. Các component này **không** phát diagnostic runtime. |
| D-015 | Diagnostic chỉ ở dev, mã tĩnh + tên component, không dữ liệu người dùng; khử trùng lặp theo instance `NovaProvider` (ref), ngoài provider theo instance component; không store module-level. | Cấm global mutable singleton; cô lập SSR. |
| D-016 | Toolchain dev: npm + `package-lock.json`, Node `^22.12 \|\| ^24` cho dev/CI. Conventions toolchain. | Không trộn package manager. |
| D-017 | Theme ngoài provider và quyền sở hữu token: CSS component dùng `var(--nova-x, <light>)` sinh từ nguồn token (§8.2); provider nhận `className` làm **lớp token của consumer** và truyền nguyên danh sách lớp sang scope lồng và wrapper portal (§8.3). | Component server-compatible hiển thị đúng mà không cần provider hay hook; override token đi theo portal mà không đọc DOM. |
| D-018 | Hồ sơ CSP hỗ trợ: CSP-A (§9) không `unsafe-eval`, script không inline, Nova không chèn `<script>`/`<style>`, không bootstrap theme inline; `style-src-attr 'unsafe-inline'` là giới hạn được nêu rõ. | Kiểm được trên fixture production; không hứa điều chưa chứng minh. |
| D-019 | Lỗi cấu hình tên truy cập/khóa là **lỗi cấu hình truy cập được** (render thông báo cục bộ thay control, không render control vô danh), không chỉ diagnostic. | Theo amendment accessible name của spec; xác định ngay lúc render nên SSR = client. |

## 4. Public contract (`kind: api`)

Hợp đồng công khai: bản đồ `exports`, khai báo TypeScript của các subpath, biến `--nova-*`, thuộc tính `data-nova-theme` trên phần tử scope/wrapper (selector duy nhất được công khai), tên và thứ tự layer, file CSS công bố. **Không công khai:** `src/lib/**`, class `.nova-*`, `data-*` khác, cấu trúc DOM bên trong.

| Subpath | Export | Client? |
|---|---|---|
| `.` | Re-export **có tên, tường minh** (không `export *`) mọi symbol P0 kể cả `focusFirstInvalid`; không directive. | Barrel |
| `./theme` | `NovaProvider`, `ThemeProvider`, `useNovaTheme`, types | Có |
| `./i18n` | `NovaStrings`, `NovaStringOverrides`, `vi`, `en` | Không (dữ liệu) |
| `./types` | Types chung của hợp đồng nền; `DataState` và `DataStateProps` thuộc `./data-state` | Chỉ type |
| `./button` | `Button`, `IconButton`, `ButtonGroup` | Có (`ButtonGroup` không) |
| `./avatar` | `Avatar`, `AvatarGroup` | Có |
| `./badge` | `Badge` | Không |
| `./card` | `Card`, `CardGroup`, `Section`, `SectionItem` | Không |
| `./link` / `./breadcrumb` | `Link` / `Breadcrumb` | Không / Có |
| `./alert` | `Alert` | Có |
| `./data-state` | `DataState`, `Empty`, `Skeleton`, `Spinner`, `Progress` | Có (`Empty`, `Skeleton` không) |
| `./field` | `Field`, `Label`, `FormErrors`, `focusFirstInvalid` | Có (`Label` không; `focusFirstInvalid` là hàm DOM) |
| `./input` | `Input`, `Textarea`, `InputGroup` | Có (`InputGroup` không) |
| `./checkbox` / `./switch` / `./radio-group` | `Checkbox` / `Switch` / `RadioGroup` | Có |
| `./tokens.css`, `./styles.css`, `./styles/*.css` | CSS đã biên dịch | — |

`package.json`: `"type": "module"`, điều kiện `types` + `default`, `"sideEffects": ["**/*.css"]`, runtime dependency duy nhất `@base-ui/react` (minor đã smoke, khóa lockfile), peer `react`/`react-dom` `^19.0.0`, version 0.x, chưa publish. Consumer TS tối thiểu 5.7 kiểm trên `.d.ts` đóng gói.

**Chữ ký P0 hoàn chỉnh** (kế thừa nguyên văn `ValueProps`, `SurfaceProps`, `FieldProps`, `AccessibleName`, `NativeInputProps`, `NativeTextareaProps`, `Key` từ hợp đồng chung):

```ts
// ./theme
type NovaTheme = 'light' | 'dark' | 'system';
type NovaProviderProps = { children: ReactNode; locale?: 'vi' | 'en' | (string & {}); timeZone?: string;
  dir?: 'ltr' | 'rtl'; theme?: NovaTheme; initialResolvedTheme?: 'light' | 'dark';
  strings?: NovaStringOverrides; portalContainer?: HTMLElement | null; className?: string };
type ThemeProviderProps = { children: ReactNode; theme: NovaTheme; initialResolvedTheme?: 'light' | 'dark'; className?: string };
declare function useNovaTheme(): { theme: NovaTheme; resolvedTheme: 'light' | 'dark' };
// ./i18n — namespace P0: common, forms, feedback, navigation; giá trị là string hoặc { one; other } với {count}
type NovaStringOverrides = { [N in keyof NovaStrings]?: Partial<NovaStrings[N]> }; // nhận mọi Partial<NovaStrings> của spec

// ControlProps của spec, tinh chỉnh nhánh nameFromField (thu hẹp, không đổi union AccessibleName):
// khi nameFromField: true thì description, error, required là never — lấy từ Field.

// ./button
type ButtonState = { disabled: boolean; loading: boolean };
type ButtonRender = ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>
  | ((props: ButtonHTMLAttributes<HTMLButtonElement> & { ref: Ref<HTMLButtonElement> }, state: ButtonState) => ReactElement);
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'children'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean;
  disabled?: boolean; type?: 'button' | 'submit' | 'reset'; children: ReactNode; render?: ButtonRender; ref?: Ref<HTMLButtonElement> };
type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label' | 'aria-labelledby'> & { label: string; icon: ReactNode };
type ButtonGroupProps = SurfaceProps & { children: ReactNode; orientation?: 'horizontal' | 'vertical'; ref?: Ref<HTMLDivElement> }
  & ({ label: string; 'aria-labelledby'?: never } | { label?: never; 'aria-labelledby': string });

// ./avatar
type AvatarProps = SurfaceProps & { name: string; src?: string; alt?: string; size?: 'sm' | 'md' | 'lg'; decorative?: boolean; ref?: Ref<HTMLSpanElement> };
type AvatarGroupProps = SurfaceProps & { children: ReactNode; label: string; max?: number; ref?: Ref<HTMLDivElement> };

// ./badge, ./card
type BadgeProps = SurfaceProps & { tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info'; children: ReactNode; icon?: ReactNode; ref?: Ref<HTMLSpanElement> };
type CardProps = SurfaceProps & { children: ReactNode; ref?: Ref<HTMLDivElement> };
type CardGroupProps = SurfaceProps & { children: ReactNode; gap?: 'sm' | 'md' | 'lg'; ref?: Ref<HTMLDivElement> };
type SectionProps = SurfaceProps & { title: ReactNode; headingLevel?: 2 | 3 | 4; description?: ReactNode; actions?: ReactNode; children: ReactNode; ref?: Ref<HTMLElement> };
type SectionItemProps = SurfaceProps & { children: ReactNode; ref?: Ref<HTMLDivElement> };

// ./link, ./breadcrumb
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & { href: string; children: ReactNode; ref?: Ref<HTMLAnchorElement> };
type BreadcrumbItem = { id: string; label: string; href?: string };
type BreadcrumbProps = SurfaceProps & { items: readonly BreadcrumbItem[]; renderLink?: (item: BreadcrumbItem) => ReactNode; label?: string; ref?: Ref<HTMLElement> };

// ./alert
type AlertProps = SurfaceProps & { tone?: 'tip' | 'info' | 'success' | 'warning' | 'error'; title?: ReactNode; children?: ReactNode;
  actions?: ReactNode; onDismiss?: () => void; live?: 'off' | 'polite' | 'assertive'; 'aria-label'?: string; ref?: Ref<HTMLDivElement> };

// ./data-state
type DataStateProps = SurfaceProps & { state: 'idle' | 'loading' | 'empty' | 'error' | 'ready'; message?: string;
  onRetry?: () => void; retryPending?: boolean; children?: ReactNode; refreshing?: boolean; ref?: Ref<HTMLDivElement> };
type EmptyProps = SurfaceProps & { title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: ReactNode; ref?: Ref<HTMLDivElement> };
type SkeletonProps = SurfaceProps & { shape?: 'text' | 'rect' | 'circle'; ref?: Ref<HTMLDivElement> };
type SpinnerProps = SurfaceProps & { label?: string; size?: 'sm' | 'md' | 'lg'; ref?: Ref<HTMLSpanElement> };
type ProgressProps = SurfaceProps & { value?: number | null; max?: number; label: string; ref?: Ref<HTMLDivElement> };

// ./field
type FieldRootProps = SurfaceProps & { id?: string; label: ReactNode; description?: ReactNode; error?: ReactNode; required?: boolean; children: ReactNode; ref?: Ref<HTMLDivElement> };
// export tên Field, props FieldRootProps
type LabelProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> & { children: ReactNode; required?: boolean; ref?: Ref<HTMLLabelElement> };
type FormErrorsProps = SurfaceProps & { errors: readonly { id: string; message: string; fieldId?: string }[]; ref?: Ref<HTMLDivElement> };
declare function focusFirstInvalid(root: HTMLElement): HTMLElement | null; // chỉ gọi ở client, trong handler submit

// ./input
type InputProps = ValueProps<string> & ControlProps & NativeInputProps & { type?: 'text' | 'email' | 'url' | 'password' | 'search' | 'tel'; placeholder?: string; autoComplete?: string; maxLength?: number };
type TextareaProps = ValueProps<string> & ControlProps & NativeTextareaProps & { rows?: number; maxLength?: number; resize?: 'vertical' | 'none' };
type InputGroupProps = SurfaceProps & { children: ReactElement; start?: ReactNode; end?: ReactNode; ref?: Ref<HTMLDivElement> };

// ./checkbox, ./switch
type ToggleNativeProps = { name?: string; form?: string; autoComplete?: ComponentPropsWithRef<'input'>['autoComplete']; submissionValue?: string; ref?: Ref<HTMLElement>; inputRef?: Ref<HTMLInputElement> };
// name/form/autoComplete chuyển nguyên tới hidden input; state vẫn là boolean (| 'mixed'), giá trị submit chỉ từ submissionValue.
type CheckboxProps = ValueProps<boolean | 'mixed'> & ControlProps & ToggleNativeProps;
type SwitchProps = ValueProps<boolean> & ControlProps & ToggleNativeProps;

// ./radio-group
type RadioOption<K extends Key> = { value: K; label: ReactNode; disabled?: boolean };
type RadioGroupProps<K extends Key> = ValueProps<K | null> & ControlProps & { options: readonly RadioOption<K>[];
  orientation?: 'horizontal' | 'vertical'; form?: string; autoComplete?: ComponentPropsWithRef<'input'>['autoComplete'];
  serializeValue?: (key: K) => string; ref?: Ref<HTMLDivElement> };
// autoComplete chuyển nguyên tới các input radio native; state là key K, giá trị submit chỉ từ serializeValue/codec mặc định.
```

Quy tắc chung: props HTML native được truyền tới phần tử ngữ nghĩa nêu ở §11; Nova sở hữu `value`/`onChange`/`checked` native và các thuộc tính ARIA nó tính ra (consumer `aria-describedby` được **gộp**, không ghi đè). `render` của Button chỉ hợp lệ khi phần tử trả về là `<button>` native nhận đủ props và `ref`; liên kết dùng `Link`, không render Button thành `<a>`; không lồng button trong button. Card không có part con (heading/body/footer do consumer compose bằng HTML ngữ nghĩa và `Section`).

## 5. Ranh giới và hướng phụ thuộc

```text
consumer app ──> @sdcorejs/nova/<subpath>
   components ──> providers/nova (context đọc) ──> i18n, types
        ├──> src/lib (private: value controller, diagnostics, cx, safe href, graphemes, accessible name, radio key codec)
   providers/nova ──> portal scope (private, không export)
        └──> @base-ui/react ──> react (peer)
   tokens (TS) ──> scripts ──> tokens.css + fallback light trong styles/*.css
```

Cạnh component → component được phép: `Input`/`Textarea`/`Checkbox`/`Switch`/`RadioGroup` → context nội bộ của `Field`; `Field` → `Label`; `Breadcrumb` → `Link`; `Alert` → `IconButton`; `DataState` → `Spinner`, `Empty`, `Button`. Component server-compatible không import provider/context. Module thuần (`types`, `i18n`, `tokens`) không import component/provider; provider không import component; không vòng phụ thuộc (INV-011).

## 6. Chủ sở hữu state

| State | Chủ sở hữu | Ghi chú |
|---|---|---|
| `theme`, `locale`, `dir`, `timeZone`, `strings`, `portalContainer`, lớp token | Ứng dụng → props của từng `NovaProvider`/`ThemeProvider` | Không setter trong hook. `timeZone` mặc định `UTC`; IANA không hợp lệ → `UTC` + diagnostic. |
| `resolvedTheme` khi `system` | Instance provider | Server và render client đầu = `initialResolvedTheme ?? 'light'`; `matchMedia` trong effect, có cleanup. |
| Value control | Consumer (controlled) hoặc instance (uncontrolled, `defaultValue` chỉ lúc mount) | Callback là **đề xuất**; control controlled không đổi DOM cho tới khi prop đổi (INV-008). |
| ID label/description/error | Instance `Field` qua `useId` | Đúng một control nhận `nameFromField` (INV-009). |
| Ảnh Avatar | Instance Avatar (Base UI) | Reset khi `src` đổi. |
| Mở rộng Breadcrumb thu gọn | Instance Breadcrumb | Thu gọn hiển thị bằng container query, không đo JS. |
| Retry đang chờ | **Consumer** qua `retryPending` | DataState **không có chốt nội bộ**: mỗi lần kích hoạt gọi `onRetry` đúng một lần; khi `retryPending` true nút giữ focus, `aria-disabled`, `aria-busy`, bỏ qua kích hoạt; false thì nhận lại. Thử lại thất bại nhiều lần vẫn bấm được. |
| Hiển thị Alert | Consumer | Không tự ẩn. |
| Khử trùng lặp diagnostic | Ref instance `NovaProvider` (hoặc instance component ngoài provider) | Không store module-level. |

## 7. SSR, hydration, ranh giới Server/Client và dùng ngoài provider

- Không state mutable cấp module (INV-001). Mọi subpath import được trong Node không DOM; không truy `window`, `document`, `localStorage`, `matchMedia`, `navigator` khi đánh giá module hay render server (INV-002).
- Server và render client đầu giống hệt: `useId`, không `Math.random`/`Date.now`, initials theo grapheme, `system` giải quyết sau mount, responsive bằng CSS; không `suppressHydrationWarning` (INV-003).
- `NovaProvider` render một phần tử scope (`display: contents` qua CSS) mang `class="nova-theme <lớp consumer>"`, `data-nova-theme`, `dir`, `lang`. `ThemeProvider` lồng render scope mang `data-nova-theme` và **cộng dồn** lớp token của cha với `className` riêng; kế thừa locale/dir/strings/portalContainer. `system` được tô bằng `@media (prefers-color-scheme: dark)` nên paint đầu đúng, markup không đổi.
- **Ngoài provider (default đã chọn):** component vẫn đúng giao diện light nhờ fallback trong `var()` (§8.2), biến `--nova-*` do consumer khai ở tổ tiên vẫn được kế thừa; client component dùng `vi`, catalog `vi`, không đặt `dir` (kế thừa tài liệu; RTL bàn phím cần provider `dir`), **không** phát diagnostic thiếu provider. Không bắt buộc provider vì component server-compatible không thể kiểm tra provider nếu không thêm hook/`'use client'`, và bắt buộc provider sẽ ép cả cây thành client chỉ để báo lỗi. Provider vẫn là nơi duy nhất cấp theme dark/system, i18n, dir và portal; control dùng `nameFromField` vẫn bắt buộc nằm trong `Field` hợp lệ (§11).
- Prop từ server sang client chỉ serializable: `strings` là dữ liệu thuần; `renderLink`, `serializeValue`, `onValueChange` phải khai ở client boundary của consumer.
- `focusFirstInvalid` là tiện ích DOM mệnh lệnh, **không** pure và **không** gọi được ở server; module của nó không truy global khi import.

## 8. CSS, tokens và theme

### 8.1 Layer và scope

`tokens.css` mở đầu `@layer nova.tokens, nova.base, nova.components;`. Biến `--nova-*` khai trên `:where(.nova-theme)` theo `data-nova-theme` light/dark/system; không khai trên `:root`, `html`, `body`. `nova.base` chỉ có tiện ích namespace (visually-hidden, vòng focus, `display: contents` của scope), không reset, không selector chỉ theo tên phần tử. CSS consumer ngoài layer thắng CSS Nova.

### 8.2 Fallback ngoài provider

Component CSS viết `var(--nova-x)`; bước build thay bằng `var(--nova-x, <giá trị light>)` lấy từ cùng nguồn token (D-013). Kiểm AST: mọi `var(--nova-*)` trong CSS component có fallback đúng giá trị light, không tên token lạ. Không có khai báo biến ngoài `.nova-theme`.

### 8.3 Lớp token của consumer và portal

- **API sở hữu token:** consumer override bằng CSS ngoài layer khai trên lớp mình truyền qua `className` của provider, ví dụ `.brand { --nova-color-action: … }`, `.brand[data-nova-theme="dark"] { … }`, `@media (prefers-color-scheme: dark) { .brand[data-nova-theme="system"] { … } }`.
- Scope lồng và **wrapper portal** nhận đủ danh sách lớp + `data-nova-theme` + `dir` + `lang` từ context, nên toàn bộ override khai theo lớp đi theo nội dung portal mà không đọc hay sao chép giá trị DOM. Không có prop token inline (tránh `style` attribute trong SSR).
- Wrapper portal do provider sở hữu là **phần tử con mới** của host (`portalContainer ?? document.body`), chỉ tạo sau mount; **không bao giờ** sửa thuộc tính, class hay style của host dùng chung. Hai root dùng chung host có hai wrapper riêng.
- **Giới hạn được hỗ trợ:** override khai trên tổ tiên không mang lớp (ví dụ `body { --nova-x }`) hoặc theo selector cấu trúc (`.page .nova-theme`) bị khai báo của `.nova-theme` che bên trong scope và không đi theo portal; override inline của consumer trên tổ tiên cũng vậy. Ngoài provider, các override đó vẫn có hiệu lực vì chỉ dùng fallback khi biến chưa định nghĩa.
- P0 không có overlay công khai: helper portal là private, chỉ phục vụ S01-AC03 và test; P1 dùng lại.

### 8.4 Contrast, trạng thái hệ thống và vùng chạm

Viền **trang trí** (`--nova-color-border`) tách khỏi **ranh giới control** (`--nova-color-control-border`, ≥ 3:1 với nền và surface lân cận). Giá trị là candidate; test contrast quyết định, sửa giá trị trong nguồn token chứ không sửa ngưỡng test.

| Token | Light | Dark | Yêu cầu |
|---|---|---|---|
| background / surface | `#ffffff` / `#f7f7f8` | `#111113` / `#1c1c20` | — |
| text / text-muted | `#171717` / `#5c5c63` | `#f4f4f5` / `#a1a1aa` | ≥ 4.5:1 |
| border (trang trí) | `#d8d8de` | `#52525b` | Không tính là ranh giới tương tác |
| control-border | `#8a8a93` | `#71717a` | ≥ 3:1 với background và surface |
| focus-ring | `#171717` | `#f4f4f5` | ≥ 3:1; 2px, offset 2px |
| action / on-action | `#171717` / `#ffffff` | `#f4f4f5` / `#171717` | ≥ 4.5:1 |
| error text / surface | `#b42318` / `#fef3f2` | `#fda29b` / `#55160c` | text ≥ 4.5:1 trên cả background và surface tone |
| success | `#067647` / `#ecfdf3` | `#75e0a7` / `#053321` | như trên |
| warning | `#b54708` / `#fffaeb` | `#fec84b` / `#4e1d09` | như trên |
| info | `#175cd3` / `#eff8ff` | `#84caff` / `#102a56` | như trên |
| tip | `#6941c6` / `#f4f3ff` | `#bdb4fe` / `#27115f` | như trên |

Tone luôn kèm icon/text, không chỉ màu. `@media (forced-colors: active)` dùng system colors và giữ outline focus; `@media (prefers-reduced-motion: reduce)` bỏ transition/animation (Spinner/Progress vẫn có text). Khi `pointer: coarse`, vùng chạm ≥ 44×44 được tạo bởi **box của chính phần tử tương tác hoặc label bao nó** (không bằng pseudo-element trong suốt), để đo được và để control kề nhau không chồng vùng chạm.

## 9. CSP

Nova không chèn `<script>`/`<style>`, không `eval`/`new Function`, không script bootstrap theme inline, và mã Nova không tự phát thuộc tính `style` (chỉ chuyển `style` consumer truyền). Chủ sở hữu nonce là **ứng dụng consumer**; Nova không cần và không nhận nonce.

- **CSP-A (gate, header `Content-Security-Policy`):** `default-src 'self'; script-src 'self' 'nonce-{N}' 'strict-dynamic'; style-src 'self' 'nonce-{N}'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`. Fixture Vite CSR không có script inline nên bỏ nonce/`strict-dynamic` (`script-src 'self'`); fixture Next tạo nonce mỗi request trong middleware. Không có `unsafe-eval`, script không `unsafe-inline`.
- `style-src` với nonce chỉ cho phép phần tử `<style nonce>`/stylesheet; **không** áp cho thuộc tính `style`. Thuộc tính `style` (consumer, hoặc Base UI cho hidden input/định vị nếu có) cần `style-src-attr 'unsafe-inline'` — đây là **giới hạn được hỗ trợ** của P0.
- **CSP-B (thăm dò, `Content-Security-Policy-Report-Only` với `style-src-attr 'none'`):** chỉ đo và liệt kê; mã Nova phải không gây vi phạm nào, vi phạm do Base UI được ghi thành giới hạn. Ứng dụng bắt buộc `style-src-attr 'none'` không được hỗ trợ ở P0.
- Bằng chứng: build production (`vite build` + server tĩnh có header; `next build` + `next start`), đếm sự kiện `securitypolicyviolation` = 0 với CSP-A trên ba engine, cùng test chức năng thật (đổi theme đo computed style, Checkbox/Radio tạo FormData đúng, Button/Alert phát callback). CSP ở chế độ dev của Vite/Next **không** được dùng làm chứng cứ production.

## 10. Ranh giới tin cậy

- `href` chỉ render khi protocol thuộc allowlist (`http`, `https`, `mailto`, `tel`, tương đối) sau chuẩn hóa (bỏ ký tự điều khiển/khoảng trắng, không phân biệt hoa thường); ngược lại render `<span>` không điều hướng (ref nhận `null`). `target="_blank"` luôn có `rel` chứa `noopener noreferrer`, giữ token `rel` của consumer (INV-010).
- Không nhận raw HTML; không `dangerouslySetInnerHTML`; chỉ render thông điệp an toàn consumer truyền, không `Error`/stack.

## 11. Điểm hợp đồng dễ hiểu khác nhau giữa các unit

- **Button:** mặc định `type="button"`; `loading` giữ focus, `aria-busy` + `aria-disabled`, chặn `onClick` và `preventDefault` để không submit lần hai; `disabled` native. `render` giữ nguyên các ngữ nghĩa này trên phần tử consumer. `ButtonGroup` là `role="group"` có nhãn, không roving focus, không `toolbar`.
- **IconButton / tên truy cập:** `label` rỗng hoặc chỉ khoảng trắng, `aria-label` rỗng, `nameFromField` ngoài `Field` hoặc `Field` có label rỗng (`null`, `false`, `''`) → **lỗi cấu hình truy cập được**: render văn bản lỗi bản địa hóa (`forms.configurationError`), không phần tử tương tác, kèm diagnostic dev (D-019). `aria-labelledby` treo chỉ phát hiện được sau mount → diagnostic.
- **Field:** sở hữu đúng **một** control. Render `<label id htmlFor={controlId}>`, description, error. Control `nameFromField` nhận `controlId`, `aria-describedby` = description + error + của consumer (không trùng), `aria-invalid` khi có error, `required` của Field truyền thành `required` native (và `aria-required` cho nhóm). Control thứ hai dùng `nameFromField` trong cùng Field được phát hiện trong layout effect → chuyển thành lỗi cấu hình, ID cuối cùng duy nhất. Checkbox nhóm dùng `<fieldset>`/`<legend>` native, mỗi Checkbox có tên riêng.
- **focusFirstInvalid (owner Field):** consumer gọi trong `onSubmit`; tìm theo thứ tự DOM phần tử đầu tiên có `aria-invalid="true"` hoặc không thỏa constraint validation native trong `root`, ánh xạ hidden input của Checkbox/Switch/RadioGroup về control **nhìn thấy** (radio đã chọn hoặc radio bật đầu tiên), gọi `focus()` và trả về phần tử; không có thì trả `null`. Nova không tự gọi khi người dùng sửa giá trị.
- **Input/Textarea:** phát nguyên giá trị native mỗi sự kiện input, không chuẩn hóa/trim/đệm composition; không gán DOM trong effect. Ref → `<input>`/`<textarea>`; native `name`, `form`, `required`, `autoComplete`, `disabled`, `readOnly` đi thẳng vào phần tử đó. `InputGroup` chỉ bố cục `start`/`end`; nút hiện mật khẩu là `IconButton` của consumer với `aria-pressed`.
- **Checkbox/Switch:** state (`boolean | 'mixed'`) tách khỏi giá trị gửi form `submissionValue` (mặc định `'on'`); checked → FormData có `name=submissionValue`, `false`/`'mixed'` → không có. `'mixed'` ↔ indeterminate, kích hoạt từ `mixed` phát `true`. `ref` → control nhìn thấy (`role="checkbox"`/`"switch"`), `inputRef` → hidden input; `name`/`form`/`required` vào hidden input; `disabled` cả hai; `readOnly` → `aria-readonly`, Space/click/click label không phát.
- **RadioGroup:** khớp value bằng `===` với `option.value`. Giá trị form mặc định không va chạm: số → `n:<String(k)>`, chuỗi → `s:<k>` (`1` → `n:1`, `'1'` → `s:1`); `serializeValue` cho phép giá trị tùy ý. Khóa số không hữu hạn (`NaN`, `±Infinity`) hoặc hai option cho cùng chuỗi tuần tự → lỗi cấu hình truy cập được (không radio, không chọn), xác định theo thứ tự option. Value không khớp → không chọn + diagnostic, không phát `null` khi render. Root `role="radiogroup"` có `aria-labelledby` (label riêng hoặc label của Field khi `nameFromField`), `aria-describedby`, `aria-required`; mỗi option có ID duy nhất qua `useId`; `controlId` gắn lên root nên click label Field không chọn option. Phím mũi tên theo `dir` (RTL đảo trái/phải), Tab vào radio đã chọn hoặc radio bật đầu tiên rồi rời nhóm; `readOnly` cho di chuyển focus nhưng không đổi lựa chọn. Options rỗng → giải thích bản địa hóa, không radio giả.
- **DataState:** trạng thái chỉ theo `state`; `idle` không render gì; `loading` có `aria-busy` + Spinner; `ready` + `refreshing` giữ `children` cùng vị trí cây và thêm status polite; `empty` render `Empty` với `message` hoặc chuỗi mặc định, không retry; `error` hiển thị thông điệp an toàn, nút retry chỉ khi có `onRetry`, theo `retryPending` ở §6.
- **Progress:** `max` không có → 100; `max` không hữu hạn (`NaN`, `±Infinity`) hoặc ≤ 0 → 100 + diagnostic. `value` `undefined`/`null` → indeterminate; `value` không hữu hạn (`NaN`, `±Infinity`) → indeterminate + diagnostic; hữu hạn → kẹp `[0, max]`. Determinate: `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax`, `aria-valuenow`; indeterminate: không `aria-valuenow`. DOM không bao giờ chứa `NaN`/`Infinity`.
- **Alert:** `live="off"` mặc định; `polite` → `role="status"`, `assertive` → `role="alert"`; mỗi lần kích hoạt nút đóng gọi `onDismiss` một lần; chỉ có action mà thiếu `aria-label`/tiêu đề/nội dung → diagnostic.
- **Breadcrumb:** `nav` có nhãn + `ol`; item cuối `aria-current="page"`, không `href` giả; thu gọn bằng nút disclosure inline (`aria-expanded`), không popup (menu thay thế khi có C02/C12); `renderLink` chỉ được gọi cho item có `href` an toàn và phải trả anchor ngữ nghĩa; items rỗng → không render.
- **AvatarGroup:** `max` được làm tròn xuống; không hữu hạn hoặc < 1 → hiện tất cả + diagnostic; phần dư hiện `+N` với văn bản truy cập plural từ strings.

## 12. Giả định đề xuất

- A-001: Base UI ở minor được pin cung cấp Avatar, Button (`render`), Checkbox, Switch, Field/Fieldset, Input, Progress, Radio/RadioGroup, DirectionProvider với: indeterminate, readOnly, roving focus theo `dir`, hidden input nhận `name`/`form`/`required`, `inputRef`. Sai thì Nova tự render hidden input/primitive tương ứng. Kiểm bằng test hành vi trên version pin.
- A-002: `Intl.Segmenter` và `Intl.PluralRules` có trong Node và ba engine mục tiêu.
- A-003: Next.js App Router production giữ `'use client'` theo file trong package ESM không bundle và tự gắn nonce cho script inline của nó khi middleware đặt header CSP.
- A-004: Base UI có thể phát thuộc tính `style` cho hidden input/định vị; CSP-B liệt kê chính xác, không giả định trước.
- A-005: `style-src-attr` được Chromium, Firefox, WebKit ở bản Playwright pin hỗ trợ; nếu không, CSP-A fixture ghi rõ engine bị giới hạn.

## 13. Invariants kỹ thuật

- **INV-001**: Không có state mutable cấp module; mọi state runtime thuộc instance provider hoặc component, nên hai root SSR đồng thời không chia sẻ theme, locale, strings hay diagnostic.
- **INV-002**: Mọi subpath import được trong Node không DOM; không truy window, document, localStorage, matchMedia, navigator khi đánh giá module hoặc render server.
- **INV-003**: Render server và render client đầu giống hệt cho mọi component P0; ID từ useId, không giá trị ngẫu nhiên/thời gian, theme system giải quyết sau mount, responsive bằng CSS, lỗi cấu hình xác định lúc render.
- **INV-004**: Public surface chỉ gồm subpath trong exports; root barrel re-export có tên, không export *, không 'use client'; file client giữ directive sau build; specifier tương đối trong dist có đuôi .js và resolve được bằng Node; src/lib và class CSS không là API.
- **INV-005**: Runtime dependency duy nhất là @base-ui/react; peer react và react-dom ^19.0.0; cấm @angular/*, antd, openai, @openai/*, tailwindcss, tailwind-merge, @radix-ui/*, gói icon.
- **INV-006**: Mọi selector CSS nằm trong layer nova.tokens, nova.base hoặc nova.components, được scope bằng class .nova-*; biến chỉ dạng --nova-* và chỉ được khai trên .nova-theme; mọi var(--nova-*) trong CSS component có fallback bằng giá trị light của nguồn token; không selector :root, html, body hay chỉ theo tên phần tử.
- **INV-007**: Mỗi NovaProvider hoặc ThemeProvider render đúng một phần tử scope mang class nova-theme cùng lớp token cộng dồn, data-nova-theme, dir, lang; scope lồng chỉ ghi đè cây con; wrapper portal là phần tử con mới của host mang cùng lớp và thuộc tính, không bao giờ sửa host.
- **INV-008**: Control là controlled khi prop value có mặt kể cả null; defaultValue chỉ đọc lúc mount; đổi mode phát diagnostic và giữ mode mount; callback chỉ là đề xuất; disabled và readOnly không phát onValueChange; mỗi thao tác người dùng phát đúng một lần; DataState không có chốt retry nội bộ.
- **INV-009**: Mọi control và IconButton có tên truy cập không rỗng; thiếu hoặc rỗng tên, nameFromField ngoài Field hoặc trùng trong một Field render lỗi cấu hình truy cập được thay vì control vô danh; Field và đúng một control dùng chung một ID sinh ra.
- **INV-010**: href chỉ được render khi protocol thuộc allowlist http, https, mailto, tel hoặc tương đối sau chuẩn hóa; nếu không thì render văn bản không điều hướng; target _blank luôn có rel noopener noreferrer; không dangerouslySetInnerHTML.
- **INV-011**: Module thuần types, i18n, tokens không import component hay provider; provider không import component; component server-compatible không import provider; cạnh component sang component chỉ theo §5; không vòng phụ thuộc.
- **INV-012**: Mọi văn bản tích hợp đến từ catalog typed; key thiếu lấy en và phát diagnostic khử trùng lặp theo root; không hiển thị key nội bộ.
- **INV-013**: Văn bản ≥4.5:1, ranh giới control và focus ≥3:1 ở light và dark kể cả trên surface tone; viền trang trí không thay ranh giới control; vùng chạm ≥44x44 bằng box phần tử khi pointer coarse và không chồng nhau; focus 2px offset 2px; forced-colors giữ focus nhìn thấy; reduced-motion bỏ chuyển động.
- **INV-014**: Nova không chèn phần tử script hay style, không dùng eval hay new Function, không bootstrap theme inline và mã Nova không tự phát thuộc tính style; fixture production với CSP-A có 0 sự kiện securitypolicyviolation trên ba engine.
- **INV-015**: RadioGroup khớp value bằng ===, mã hóa giá trị form mặc định n:/s: không va chạm, từ chối khóa số không hữu hạn và chuỗi tuần tự trùng bằng lỗi cấu hình; Checkbox và Switch tách state khỏi submissionValue.
