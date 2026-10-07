# SD Nova — hợp đồng chung (draft r1)

Ngày đối chiếu: 07/10/2026. Chủ sở hữu đề xuất: repo sdcorejs-nova do người dùng tạo. Đây là spec review trong workspace riêng, không phải snapshot đã duyệt, implementation, hoặc chứng cứ đã publish. Mọi tên export Nova bên dưới là **proposed**.

## Phạm vi và quyết định

R-001: thư viện React Core UI độc lập cho trang end user, thương hiệu SD Nova, package @sdcorejs/nova. Không thay thế Angular Material Core. R-002: kiểm kê và định đoạt mọi export Angular phát hiện được. R-003: API React typed, accessibility, mobile, SSR và test có thể kiểm chứng. R-004: phần UI không chứa auth, tenant, REST conventions hoặc nghiệp vụ cụ thể.

D-001 (user-selected): React. D-002 (user-accepted): shadcn/ui làm nguồn code/thiết kế primitive, Base UI làm nền interaction mặc định. D-003 (user-accepted): thẩm mỹ neutral tinh tế tham khảo OpenAI Platform; không kết luận Platform dùng shadcn. D-004 (recommended): một package với subpath exports; adapters nặng optional và lazy. D-005 (recommended): hỗ trợ React 19.x trước; chỉ thêm React 18.3 sau smoke riêng, không khai peer >=18 vô hạn. D-006 (recommended): bảng dữ liệu dùng TanStack Table bên trong subpath table, không public toàn bộ engine. D-007 (recommended): CSS biên dịch sẵn và semantic CSS variables, app không cần Tailwind. D-008: Apps SDK UI, Ant Design và Angular không là dependency Nova.

Các defaults D-004…D-007 là proposal có thể sửa ở review. Không có quyền tự tạo repo, viết implementation, commit, push hoặc publish. Kiến trúc public API/state ownership/dependency direction cần gate sau khi spec được duyệt; tài liệu này chỉ đóng băng candidate để review, không tạo approved architecture bằng giả định.

## Chứng cứ nguồn

Canonical được đọc: sdcorejs-angular/versions/v19/projects/sdcorejs-angular; HEAD 4db0ac9a7ce3cc57a2d26c43ee375391db93198f; git describe v2.13-2-g4db0ac9a, checkout không có status changes được Git báo cáo. AGENTS xác nhận v19 source of truth, v20/v21/v22 là derived. So sánh theo file với tag v2.13 có trong checkout: tag-source-identical chỉ chứng minh source có ở tag; không chứng minh version npm đã phát hành. Hai commit sau tag là checkout-only delta, không được mô tả released. Không dùng tag v2.14/v2.15 ở ref khác làm baseline cho HEAD này.

Parser TypeScript đi từ src/public-api.ts và secondary testing/index.ts, theo export *, named/type export và alias package; không quét mọi class nội bộ làm API. inventory.json lưu graph và locator line; inventory.csv định đoạt từng symbol. Đây là static export inventory, không chạy Angular build để chứng minh resolution hay consumer runtime. Angular tests/docs đọc để định hướng, chưa re-run vì không sửa Angular. Mature ở đây nghĩa capability có source ổn định tại baseline, không nghĩa đã audit chất lượng.

Không phát hiện sdcorejs-nova trong Documents/sdcorejs và workspace nhiệm vụ đã kiểm tra. Có sdcorejs-react (package @sdcorejs/react 0.0.1, Ant Design); đây là repo khác, không migrate/gộp tự động. FileExplorer base có ở snapshot mới c421f687 và release-associated tag/archive v2.15; không ở older working HEAD4db0ac9. Selector/custom columns/consumer actions và typed raw adaptation không bị nhập như released enhancements từ nhiệm vụ khác. Chart đã bị loại trong changelog 2.9, không bịa entry hiện có.

Nguồn upstream được mở ngày 07/10/2026:
- [shadcn introduction](https://ui.shadcn.com/docs): code distribution để sở hữu và sửa source.
- [Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default): default cho dự án mới, Radix vẫn được hỗ trợ.
- [Base UI quick start](https://base-ui.com/react/overview/quick-start): @base-ui/react, tree-shaking, portals, CSS tùy chọn. Trang hiện hiển thị 1.8.0; không dùng 1.6.0 của changelog tháng 7 làm latest pin.
- [shadcn MIT](https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md), [Base UI MIT](https://raw.githubusercontent.com/mui/base-ui/master/LICENSE).

Nova sở hữu source đã đưa vào; lưu upstream URL + commit hash + ngày import + local diff cho mỗi source copy. Giữ nguyên copyright và permission notice trong THIRD_PARTY_NOTICES và file/source đáng kể; kiểm tra license transitive trong lockfile. MIT của Angular không tự cấp quyền cho CKEditor/Monaco/PDF/workbook assets. Không đưa premium editor plugin vào Core. Exact version pin được chọn khi implementation bắt đầu, qua compatibility smoke, không ghi latest floating làm reproducible dependency.

## Packaging và biên giới

Candidate cấu trúc: src/components/<name>, src/hooks/<name>, src/providers/<name>, src/lib (private), src/styles, adapters/<name>, docs và examples. Chỉ component có responsibility riêng mới tách; không facade/service factory cho một callback đơn giản. Pure type/utility subpath không import UI/provider. Primitive → composite → consumer screen; dữ liệu/backend/auth thuộc consumer. Theme/i18n provider không là service locator. Không global mutable singleton; không prototype augmentation.

ESM + declarations; exports rõ ./button, ./field, ./table, ./dialog, ./theme, ./i18n, ./tokens.css, ./styles.css và ./styles/<component>.css; root tiện dụng được phép nhưng tránh kéo adapters nặng. React/react-dom peer ^19.0.0 (same major, matrix minimum + highest supported minor); TypeScript consumer 5.7+ candidate kiểm tra declarations. @base-ui/react runtime dependency pin compatible minor trong lockfile. Không bundle React. Table engine dependency chỉ reachable từ table. RHF adapter optional peer trong ./adapters/react-hook-form; không buộc forms cơ bản dùng RHF hay Zod. PDF/editor/workbook optional peer qua adapter, không import engine tại root. Thêm peer mới là contract review.

Consumer import tokens.css rồi component CSS hoặc styles.css một lần. sideEffects chỉ CSS whitelist, JS sideEffects=false. Namespace .nova-* + --nova-*; không global reset, không override button/input/body app. Dùng @layer nova.tokens, nova.base, nova.components; doc thứ tự layer override. CSS build loại Tailwind runtime; className/style pass-through cho phần root, slotProps cho composite khi thật cần; không public internal classname như API ổn định. Portal nhận cùng theme context/dir, gắn .nova-theme và CSS vars lên container, không mất theme khi ra body. CSS/tree-shaking được smoke thực trên tarball, không suy từ source.

Next.js: pure utilities/types có thể import Server Component; interaction file có use client, root không ép toàn package thành Client Component. Props server→client chỉ serializable; render callback khai ở consumer client boundary. Vite CSR và Next SSR là hai consumer bắt buộc. Không truy window/document/localStorage/matchMedia/EventSource ở module evaluation hoặc server render. useId cho ARIA, stable caller keys cho data; không Math.random/Date.now tạo markup IDs. Portal default không SSR markup overlay; server/first client render closed deterministic; overlay defaultOpen mount sau hydration và announce một lần. Nếu cần SSR open content, consumer render inline content theo riêng contract, không tạo mismatch bằng suppressHydrationWarning.

## Tokens và visual contract

Neutral surface trắng/xám, CTA đen, border mảnh, ít shadow. Typography system sans (không tải font ngoài mặc định), body 14/20 desktop và 16/24 input mobile, label 13/18, title 20/28 semibold, mono chỉ code. Spacing 4,8,12,16,24,32,48; radius 6 control, 10 card, 12 overlay; border 1px; focus ring 2px + offset 2px. Control visual sm=28/md=36/lg=44 nhưng pointer hit area tối thiểu 44×44 ở coarse pointer, không làm selection checkbox nhỏ khó chạm. Không dùng màu là tín hiệu duy nhất.

Candidate semantic pairs (phải đo contrast trước release): light background #ffffff, surface-muted #f7f7f8, text #171717, text-muted #5c5c63, border #d8d8de, action #171717, on-action #ffffff; dark background #111113, surface #1c1c20, text #f4f4f5, muted #a1a1aa, border #52525b, action #f4f4f5, on-action #171717. Error #b42318/light và #fda29b/dark; success có icon + text, không chỉ green. Border decorative không được tính như interactive outline: input boundary dùng token contrast >=3:1 khi cần nhận diện. WCAG AA text >=4.5:1, large >=3:1; focus/control nontext >=3:1. Selected/hover/disabled có semantic vars riêng, disabled vẫn đọc được ở default palette. Visual screenshot test 320,375,768,1280px, 200% zoom, light/dark, high contrast/forced colors, reduced motion.

Responsive dùng CSS/container queries cho presentation. Không hide desktop/mobile bằng JS trước hydration. Layout 1 cột ở narrow, action wrap hoặc overflow menu; overlay max-width calc(100vw - 32px), 100dvh và safe-area padding, scroll content riêng, footer không che input khi bàn phím bật. 200% zoom không cắt label/error. Table scrolling có vùng accessible và không ép mọi bảng thành card nếu consumer chưa có row renderer. Reduced motion bỏ transition không cần thiết; loading vẫn có text.

## Hợp đồng nền áp dụng cho từng spec

Các mục dưới là normative inheritance cho mọi dossier, không phải checklist lặp. Mỗi dossier bổ sung khác biệt cụ thể; tests tại từng dossier là AC tương ứng, không được bỏ vì đã có global tests.

G-STATE: controlled nếu có value (bao gồm null), defaultValue chỉ lần mount; callback là proposal value, không mutate props. Không hỗ trợ chuyển controlled↔uncontrolled giữa vòng đời; dev warning và giữ mode mount. Mutually exclusive union cho hai mode; readOnly giữ copy/focus nhưng không đổi value; disabled không action/event. loading không đồng nghĩa disabled trừ action chống gửi hai lần. Callback metadata chỉ stable public info, không internal DOM/event engine type.

G-LIFECYCLE: async có AbortSignal, generation token latest-wins cho read, abort + ignore late response sau unmount/scope change. Cancel read không báo lỗi; mutation không tự retry, không giả remote cancel đã thành công. Không gọi onSuccess hai lần StrictMode. Mỗi promise overlay settle đúng một lần. Effect cleanup timer/listener/subscription/object URL/observer; request/tenant scope không chung module store. Error raw không render stack/secrets; consumer map safe message.

G-A11Y: semantic HTML trước role; label bắt buộc ở icon-only/action/input, aria-describedby description/error, aria-invalid khi error visible; keyboard từ primitive được giữ khi compose render prop. Focus visible, focus return hợp lý nếu trigger biến mất thì consumer fallback. Tooltip không thay accessible label. Live polite cho status, alert chỉ lỗi cần hành động; skeleton aria-hidden và region busy. Không tự focus khi fetch kết thúc; focus input lỗi đầu chỉ khi submit. API không nhận raw HTML trừ adapter có sanitizer explicit.

G-RENDER: empty value có placeholder localized, không biến 0/false thành empty; loading giữ dữ liệu trước nếu an toàn, initial loading có skeleton/status, failed có retry callback consumer, không retry tự động mutation; disabled visual+semantics. Pure display N/A async/empty/error nếu không có dữ liệu đầu vào (nêu trong dossier). Theme và mobile theo tokens; SSR deterministic. Render slot nhận raw typed T; không ép object thành JSON hoặc display string, không infer domain keys.

G-I18N: NovaProvider locale mặc định vi, dir mặc định ltr và strings map typed namespace; bundled vi/en, fallback en theo key thiếu và dev warning, không hiển thị key nội bộ. Consumer app route locale/timezone là owner. Intl formatter nhận locale+timeZone explicit; never server machine timezone. Text và ICU/plural catalog không nối fragment theo English grammar. RTL chuyển placement/start/end và arrow behavior phù hợp, icon directional mirror khi cần.

G-COMPOSE: ref tới root/semantic control documented, HTML props phù hợp không đè internal semantics; render polymorphism theo Base UI render (không mặc định asChild Radix). onClick consumer có thể preventDefault trước action; không bọc button trong button. Actions consumer-owned với data raw T; children action chỉ một cấp menu, deeper groups compile/runtime reject; không suy default CRUD, download, upload hay permission.

Types chung (spec, không là implementation):
```ts
import type { ReactNode, CSSProperties, Ref } from 'react';
export type ValueProps<T> =
 | { value: T; defaultValue?: never; onValueChange: (next: T) => void }
 | { value?: never; defaultValue?: T; onValueChange?: (next: T) => void };
export type SurfaceProps = { className?: string; style?: CSSProperties; 'data-testid'?: string };
export type FieldProps = { id?: string; name?: string; label: ReactNode; description?: ReactNode;
 error?: ReactNode; disabled?: boolean; readOnly?: boolean; required?: boolean };

export type AccessibleName =
 | {label:NonNullable<ReactNode>; 'aria-label'?:never; 'aria-labelledby'?:never; nameFromField?:never}
 | {label?:never; 'aria-label':string; 'aria-labelledby'?:never; nameFromField?:never}
 | {label?:never; 'aria-label'?:never; 'aria-labelledby':string; nameFromField?:never}
 | {label?:never; 'aria-label'?:never; 'aria-labelledby'?:never; nameFromField:true};
export type ControlProps = Omit<Partial<FieldProps>,'label'> & AccessibleName
 & Pick<React.HTMLAttributes<HTMLElement>,'onBlur'|'onFocus'|'title'|'className'|'style'|'aria-describedby'>;
export type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>,
 'value'|'defaultValue'|'onChange'|'size'|'type'|'aria-label'|'aria-labelledby'> & {ref?:Ref<HTMLInputElement>};
export type NativeTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>,
 'value'|'defaultValue'|'onChange'|'aria-label'|'aria-labelledby'> & {ref?:Ref<HTMLTextAreaElement>};

export type ResolvedAccessibleName={id:string;ariaLabel?:string;ariaLabelledby?:string;ariaDescribedby?:string};
export type Key = string | number;
export type Action<T> = { id: string; label: string; icon?: ReactNode; disabled?: boolean;
 hidden?: boolean; onAction: (data: T) => void | Promise<void> };
export type MenuAction<T> = Action<T> | { id: string; label: string; children: readonly Action<T>[] };
export type LoadContext = { signal: AbortSignal };
export type DataState<T> = { status: 'idle'|'loading'|'success'|'error'; data?: T; errorMessage?: string };
```

## Validation và release

Mỗi AC dossier có positive/negative/boundary fixtures. Vitest + Testing Library cho value/action/abort lifecycle; Playwright Chrome/Firefox/WebKit cho focus/portal/file/mobile; axe automated và manual keyboard/screen reader (NVDA/Firefox, VoiceOver/Safari) — axe không đủ. Compile consumer TS fixture @ts-expect-error cho invalid unions/T; tests không chỉ mirror private methods. Các câu test là **authored requirements, chưa chạy** vì chưa có Nova implementation.

Release semver thực: 0.x preview có changelog/migration, 1.0 chỉ sau stable foundational + smoke; sau 1.0 breaking major, additive minor, compatible fix patch; không khóa major theo React. Không mặc định beta sẽ preserve API. Changesets candidate, CI build/lint/typecheck/tests/pack/license/API diff; smoke npm tarball sạch ở Vite và Next build+SSR hydration, CSS included+no duplicate React, import button không kéo table/editor/PDF/workbook, strict CSP không unsafe eval. Dependency security/license audit là release gate thực, không claim đã pass. Visual/a11y matrix chạy theo risk thay đổi, không screenshot mọi nội bộ. Release owner duyệt và publish theo riêng authorization, spec phase không thực hiện.

## Phases và câu hỏi review

P0: tokens, provider/i18n, primitives, Field/value conventions, exports/CSS/SSR smoke. P1: overlay/feedback, form controls/date/selection, layout, read-only display, runtime cleanup hooks. P2: table/filter/entity/tree/task/file transfer/import/preview theo consumer usecases; không chặn P0 vì muốn parity toàn Angular. P3: optional editors/org-chart/audit/history/form renderer chỉ khi có nhu cầu end user rõ; business builders/auth infrastructure excluded. FileExplorer base P2 có provenance reference snapshot; adaptation mới vẫn cần review usecase.

Recommended review defaults: React 19 only ban đầu; tokens CSS compiled; uncontrolled primitives có controlled mode; forms adapter optional RHF; date-only ISO string, datetime instant ISO + explicit zone; engine-heavy adapters optional. Cần owner xác nhận ở một vòng review: React 18 compatibility có cần ngay không; FileExplorer/import/editor có ưu tiên thực sự cho app đầu tiên không; API/core export naming giữ tên Nova ở provider nhưng component đơn giản Button/Field trong package namespace. Không cần trả lời hàng chục câu để đọc spec. Không có blocker cho authoring spec; chưa có repo Nova là blocker cho approved snapshot/implementation gate, không cho bundle review được ủy quyền.

### Defaults state và orphaned exports

Uncontrolled default khi không có defaultValue: text/InlineText empty string, Number/Date/Time/Select/Radio null, boolean false, checkbox false (không tự mixed), arrays empty, Dialog/Popover/Collapsible false. Tabs default first enabled tab trong immutable supplied order; không tab enabled thì không active và không emit lúc render. Accordion default[], Progress max100. API required controlled state như DataTable/Tree/Kanban/Segmented không tự tạo business state uncontrolled; consumer wrapper dùng useState nếu cần. Những locator chỉ có ở working snapshot cũ được giữ trong CSV phục vụ migration, không tự port exports đã mất khỏi c421.

### Hai snapshot và secondary exports — correction provenance

Selected working checkout HEAD4db0ac9 là snapshot cũ, không đại diện toàn bộ main mới. Reference commit c421f687bfba80a5dc9ec1b472d0c2c08f7b09f7 ngày 2026-10-05T12:27:40+07:00 (Merge Kanban and Segmented control into main), git describe v2.15+20 commits. Đã đọc source snapshot qua Git objects vào private task workspace, không checkout/reset canonical. Cả root barrel và mọi ng-package secondary entrypoint ở v19 được inventory, kể cả utilities/theme thiếu khỏi graph root cũ. Đối chiếu root/components/forms/services barrels và ng-package entrypoints của bốn Angular lines được lưu ở 04-source-provenance.json. Source package manifest khai version 19.2.15 không là chứng cứ tất cả c421 features đã publish. FileExplorer có release tag v2.15 commit564e63aae217ba2664f36e07fea2c74f0a338054 ngày 2026-09-25 và archived docs cho 19/20/21/22.2.15, .3.0. Official GitHub main index hiện export FileExplorer. GitHub Releases page không có entries; npm page trả403 và public registry socket bị môi trường chặn, nên npm tarball/version existence chưa independently verified. Theo user history base đã released; source/archive corroboration giữ riêng với npm verification. Kanban/Segmented/ImageEditor/Highlight mới trong c421 phải đọc reference_status trong CSV để phân biệt có trong v2.15 hay source sau tag; không suy release từ merge commit.

### Accessible name và native props — amendment sau review

Mọi standalone control bắt buộc AccessibleName, aria-label/aria-labelledby string không rỗng. nameFromField:true là explicit opt-in kế thừa label từ FieldRoot; runtime missing provider/label tạo diagnostic và accessible configuration error, không render input vô danh. Field compound và control phải dùng cùng generated id; dùng FieldRoot+nameFromField=true trong ví dụ minh họa không lặp label. Native onChange/value do Nova sở hữu, onBlur/onFocus/native autoComplete/name/form/required/ref được pass đúng semantic element. Composite controls có focusRef:Ref<HTMLElement> tới interactive trigger (Select) hoặc primary input (Combobox), ref root là HTMLElement container; không nhầm root ref với validation focus target. TS negative fixtures: Input không label/aria/nameFromField bị reject, label+aria cùng lúc bị reject; runtime empty aria string hoặc dangling labelledby bị diagnostic. Không dùng type assertion để né negative fixture.

## Evidence và giới hạn xác minh

- Working HEAD: 371 file wildcard graph, 866 symbols. Reference c421: 383 files, 936 symbols. Union inventory: 1000 unique symbol+source, 94 buckets, AST+all ng-package secondary. Relative missing: 0.
- Baseline status của union: tag-v2.15-source-identical=721; snapshot-modified-after-v2.15=113; snapshot-only-vs-v2.15=102; tag-v2.13-source-identical=64. File-level diff đánh dấu mọi symbols trong changed file conservatively, không suy symbol mới hoặc feature released. head_status/reference_status cột riêng truy vết hai source snapshots; working HEAD có SCSS/docs thay sau v2.13 dù exported declaration files có thể identical.
- Git status readonly không changes report; remote main FileExplorer index verified, npm metadata/tarball blocked. Không persist secret/credentials/private logs; repo absence chỉ inspected roots.
- Nova tests/framework smoke/visual/a11y chưa chạy, đây là authored requirements. Inventory structural verification chạy thật theo report.

## Chỉ mục capability Angular → Nova

Từng symbol/type/function/constants được liệt kê đầy đủ trong 02-inventory.csv. Models/config/support helpers không mặc định trở thành public Nova API; disposition của capability kèm các ngoại lệ symbol đã ghi trong CSV.

| Capability | Symbols | Disposition / spec | Phase / lý do |
|---|---:|---|---|
| components/anchor | 3 | C16 | P1 |
| components/api-contract-builder | 87 | EXCLUDED | API contract expression/schema/request builder không là end-user Core; app developer tooling tự sở hữu. |
| components/audit-diff | 12 | X04 | P3 |
| components/autoid-inspector | 3 | EXCLUDED | AutoID inspector dành showcase/debug; Nova chỉ data-testid pass-through, không export inspector. |
| components/avatar | 1 | C03 | P0 |
| components/badge | 2 | C04 | P0 |
| components/breadcrumb | 6 | C06 | P0 |
| components/button | 7 | C01,C02 | P0/P1 |
| components/card | 3 | C05 | P0 |
| components/ckeditor-styles | 1 | X01 | P3-adapter-replace |
| components/code-editor | 2 | X02 | P3 |
| components/data-state | 4 | C10 | P0 |
| components/editor | 9 | X01 | P3 |
| components/form-generic | 118 | X05 | P3-renderer-only |
| components/history | 1 | X04 | P3 |
| components/import-excel | 15 | U02 | P2 |
| components/inform | 3 | C09 | P0 |
| components/job-progress | 2 | C10,S06 | P0/P2 |
| components/mini-editor | 7 | X01 | P3 |
| components/modal-resizable | 1 | C13 | P2 |
| components/modal | 2 | C11 | P1 |
| components/operator | 1 | D02 | P2-private-composition |
| components/org-chart | 7 | X03 | P3 |
| components/preview | 40 | U03 | P2 |
| components/query-bar | 23 | D02 | P2 |
| components/query-builder | 47 | D03 | P2 |
| components/quick-action | 1 | C02 | P1 |
| components/section | 2 | C05,C17 | P0/P1 |
| components/side-drawer | 3 | C11 | P1 |
| components/splitter | 6 | C13 | P2 |
| components/stepper | 3 | C08 | P1 |
| components/tab-router | 8 | EXCLUDED | Tab-router decorator/outlet/navigation persistence Angular và application routing; consumer router owns routes, Tabs C07 only local tabs. |
| components/tab | 5 | C07 | P1 |
| components/table | 54 | D01,D02 | P2 |
| components/tree | 31 | D04 | P2 |
| components/upload-file | 7 | U01 | P2 |
| components/view | 1 | C15 | P1 |
| forms/autocomplete | 1 | F07 | P1 |
| forms/checkbox | 1 | F05 | P0 |
| forms/chip-calendar | 1 | F11 | P2 |
| forms/chip | 2 | F08 | P1 |
| forms/date-range | 2 | F09 | P1 |
| forms/date | 1 | F09 | P1 |
| forms/datetime | 1 | F10 | P1 |
| forms/directives | 4 | F01,F14,C15 | idiomatic-replacement |
| forms/entity-picker | 11 | F13 | P2 |
| forms/inline-text | 3 | F15 | P1 |
| forms/input-color | 2 | F04 | P2 |
| forms/input-number | 1 | F03 | P1 |
| forms/input | 12 | F02 | P0 |
| forms/label | 1 | F01 | P0 |
| forms/models | 36 | F01,F14,C15 | selective-types-not-port |
| forms/radio | 1 | F06 | P0 |
| forms/select | 5 | F07 | P1 |
| forms/src | 1 | EXCLUDED | FormsModule Angular không có React equivalent registration; import components trực tiếp. |
| forms/switch | 1 | F05 | P0 |
| forms/textarea | 1 | F02 | P0 |
| forms/time-range | 7 | F10 | P1 |
| forms/time | 11 | F10 | P1 |
| forms/tree-select | 5 | F13 | P2 |
| services/api | 21 | EXCLUDED | REST API/auth headers/caching/dedupe/HTTP implementation belongs application data layer; Core accepts callbacks. |
| services/cache | 14 | EXCLUDED | Consumer chọn query/cache library, không thêm Nova global cache hay duplicate TanStack Query abstraction. |
| services/confirm | 3 | S04 | P1 |
| services/excel | 6 | U02 | P2-adapter |
| services/loading | 2 | S05 | P1 |
| services/notify | 4 | S03 | P1 |
| services/persistence | 40 | S09 | selective-codec |
| services/storage | 6 | S09 | P2 |
| services/task | 22 | S06 | P2 |
| services/unsaved-changes | 17 | S07 | P1 |
| services/viewport | 8 | S08 | P1 |
| modules/auth | 6 | EXCLUDED | Login/session/guards/layout permission không business-free UI; forms có thể compose bằng primitives. |
| modules/keycloak | 7 | EXCLUDED | Keycloak-specific client/auth state outside Core; no peer Keycloak. |
| modules/permission | 7 | EXCLUDED | Ẩn UI không bảo đảm authorization; server/app owns permission enforcement, không Nova permission service. |
| modules/layout | 59 | C14,S08,S09 | UI-only |
| modules/icon | 15 | S01 | ReactNode-svg-no-font-registry |
| configurations/src | 2 | S01 | presentation-only |
| directives/src | 6 | C06,C12,S08,S10 | hooks-CSS-components |
| i18n/src | 8 | S01,S02 | typed-catalog-Intl |
| pipes/src | 7 | S02,C15 | pure-format-no-safeHtml |
| handlers/global-error.handler.ts | 1 | EXCLUDED | Global exception handlers/reporting integration thuộc app ErrorBoundary/observability, no framework global handler. |
| interceptors/no-internet | 2 | EXCLUDED | Offline HTTP interceptor retry/network behavior belongs app, Nova only DataState safe message. |
| interceptors/unauthorized | 1 | EXCLUDED | 401 refresh/logout policy outside Core, no interceptor port. |
| utilities/data-state | 2 | C10 | typed-state |
| utilities/read-state | 7 | C10,S05 | async-state-contract |
| utilities/extensions | 14 | EXCLUDED | Extensions/prototype injection không hợp React SSR isolation; app imports pure helpers if needed. |
| utilities/models | 6 | F14,S05 | selective-types-no-Angular-port |
| testing/test-utils.ts | 7 | TESTING | React-testing-new-harness |
| components/file-explorer | 19 | D05,U01,U03 | P2-existing-base-adapted |
| components/kanban | 13 | D06 | P3-reference-snapshot |
| components/image-editor | 16 | X06 | P3-optional-adapter |
| components/highlight | 2 | C18 | P1-safe-text |
| forms/segmented | 8 | F16 | P1 |
| utilities/theme | 3 | S01 | P0-Nova-token-replacement |

Nova adaptations được proposal riêng trên existing capabilities; Calendar internal F09 và primitive Popover/Tooltip/Empty/Progress formalize từ capability liên quan. FileExplorer base có trong c421/v2.15 source archive, không ở working checkout cũ. Không yêu cầu port chart vì không ở public graph inspected. Testing exports thay bằng React harness riêng; không publish Angular utilities.

## Chỉ mục spec cá thể

- C01 — Button / IconButton; P0; nguồn components/button.
- C02 — ActionMenu / QuickActions; P1; nguồn components/button,components/quick-action.
- C03 — Avatar / AvatarGroup; P0; nguồn components/avatar.
- C04 — Badge; P0; nguồn components/badge.
- C05 — Card / CardGroup / Section; P0; nguồn components/card,components/section.
- C06 — Breadcrumb / Link; P0; nguồn components/breadcrumb,directives.
- C07 — Tabs / TabPanel; P1; nguồn components/tab.
- C08 — Stepper; P1; nguồn components/stepper.
- C09 — Alert / Inform; P0; nguồn components/inform.
- C10 — DataState / Empty / Skeleton / Spinner / Progress; P0; nguồn components/data-state,components/job-progress,utilities/data-state,utilities/read-state.
- C11 — Dialog / Sheet / Drawer; P1; nguồn components/modal,components/side-drawer.
- C12 — Popover / Tooltip; P1; nguồn directives,components/anchor.
- C13 — ResizableDialog / Splitter; P2; nguồn components/modal-resizable,components/splitter.
- C14 — AppShell / Sidebar / Navigation; P1; nguồn modules/layout.
- C15 — ReadOnlyValue / View; P1; nguồn components/view,forms/models.
- F01 — Field / Label / FormErrors; P0; nguồn forms/label,forms/directives,forms/models.
- F02 — Input / Textarea; P0; nguồn forms/input,forms/textarea.
- F03 — NumberInput; P1; nguồn forms/input-number.
- F04 — ColorInput; P2; nguồn forms/input-color.
- F05 — Checkbox / Switch; P0; nguồn forms/checkbox,forms/switch.
- F06 — RadioGroup; P0; nguồn forms/radio.
- F07 — Select / Combobox / Autocomplete; P1; nguồn forms/select,forms/autocomplete.
- F08 — MultiSelect / ChipInput; P1; nguồn forms/chip.
- F09 — DatePicker / DateRangePicker / Calendar; P1; nguồn forms/date,forms/date-range.
- F10 — TimeInput / TimeRangeInput / DateTimePicker; P1; nguồn forms/time,forms/time-range,forms/datetime.
- F11 — CalendarChips; P2; nguồn forms/chip-calendar.
- F12 — InlineEdit; P1; nguồn forms/inline-text.
- F13 — TreeSelect / EntityPicker; P2; nguồn forms/tree-select,forms/entity-picker.
- F14 — useFormValidation / RHF adapter; P1; nguồn forms/models,forms/directives.
- D01 — DataTable / TablePagination; P2; nguồn components/table.
- D02 — QueryBar / FilterPanel / OperatorSelect; P2; nguồn components/query-bar,components/operator.
- D03 — QueryBuilder / serializeQuery; P2; nguồn components/query-builder.
- D04 — Tree / TreeItem; P2; nguồn components/tree.
- D05 — FileExplorer (existing base + Nova adaptations); P2; nguồn components/file-explorer@c421f687; release-source v2.15.
- U01 — FileUpload / useFileTransfer; P2; nguồn components/upload-file.
- U02 — ImportWizard / workbook adapter; P2; nguồn components/import-excel,services/excel.
- U03 — ImagePreview / PdfPreview; P2; nguồn components/preview.
- X01 — RichTextEditor / MiniEditor; P3; nguồn components/editor,components/mini-editor,components/ckeditor-styles.
- X02 — CodeEditor; P3; nguồn components/code-editor.
- X03 — OrgChart; P3; nguồn components/org-chart.
- X04 — AuditDiff / HistoryTimeline; P3; nguồn components/audit-diff,components/history.
- X05 — SchemaFormRenderer (optional); P3; nguồn components/form-generic.
- S01 — NovaProvider / ThemeProvider / useNovaTheme; P0; nguồn configurations,modules/icon,i18n.
- S02 — useFormatter / i18n strings; P1; nguồn i18n,pipes.
- S03 — ToastProvider / useToast; P1; nguồn services/notify.
- S04 — ConfirmProvider / useConfirm; P1; nguồn services/confirm.
- S05 — useAsyncAction / BusyBoundary; P1; nguồn services/loading.
- S06 — useTask / TaskProvider / JobProgress; P2; nguồn services/task,components/job-progress.
- S07 — useUnsavedChanges / Navigation adapter; P1; nguồn services/unsaved-changes.
- S08 — useViewport / useMediaQuery; P1; nguồn services/viewport,directives,modules/layout.
- S09 — useStoredState / PersistenceAdapter; P2; nguồn services/storage,services/persistence.
- S10 — CopyButton / useClipboard / ScrollArea; P1; nguồn directives.
- C16 — AnchorNavigation / AnchorSection; P1; nguồn components/anchor.
- C17 — CollapsibleSection / Accordion; P1; nguồn components/section.
- F15 — InlineText; P1; nguồn forms/inline-text.
- D06 — Kanban; P3; nguồn components/kanban@c421f687.
- F16 — SegmentedControl; P1; nguồn forms/segmented@c421f687.
- X06 — ImageEditor; P3; nguồn components/image-editor@c421f687.
- C18 — Highlight / findHighlightRanges; P1; nguồn components/highlight,utilities/extensions@c421f687.


## Chuyển bộ draft vào repo Nova

Bộ draft được tác giả tạo trước khi repo Nova tồn tại ở inspected roots. Ngày 07/10/2026, theo yêu cầu người dùng, repo sdcorejs/sdcorejs-nova đã được clone và bộ tài liệu đặt tại docs/nova. Nhận xét repo chưa tồn tại phía trên là provenance của thời điểm authoring, không phải trạng thái checkout hiện tại. Đây vẫn là design-only draft: chưa approved snapshot, implementation, commit hoặc push.
