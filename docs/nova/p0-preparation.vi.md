# SD Nova P0 — checklist kỹ thuật và khu vực kiểm thử

Checklist kế thừa các test cases của thiết kế P0 ngày 07/10/2026. Đây là tham chiếu hành vi và phạm vi kiểm tra; không phải kết quả run hiện tại. Xem [tích hợp P0](p0-integration.vi.md), [kiến trúc P0](p0-architecture.vi.md), package manifest và source/tests để kiểm chứng implementation.

## 1. Package và toolchain tham chiếu

| Mối quan tâm | Đề xuất | Ghi chú |
|---|---|---|
| Package manager | npm + `package-lock.json` (D-016) | Default tham chiếu trong gói duyệt; ghi `packageManager` sau khi chốt; không trộn. |
| Node dev/CI | `^22.12 \|\| ^24` | Chỉ ràng buộc công cụ. |
| Runtime | `@base-ui/react` duy nhất; peer `react`, `react-dom` `^19.0.0` | Pin minor sau smoke, không ghi “latest”. |
| TypeScript | Pin bản ổn định; `module`/`moduleResolution` `NodeNext`; specifier tương đối viết sẵn `.js` | Không dựa `rewriteRelativeImportExtensions`; fixture consumer kiểm TS 5.7 và bản pin (D-010). |
| Build | `tsc -p tsconfig.build.json` (ESM từng module + `.d.ts`); Lightning CSS qua `scripts/build-css.mjs`, chèn fallback light từ `src/tokens/tokens.ts` | Không bundler, không Tailwind (D-009, D-013, D-017). |
| Unit/SSR | Vitest (project `unit` jsdom, project `ssr` node) + Testing Library + `user-event` | Hydration: `renderToString` + `hydrateRoot` với `onRecoverableError`. |
| Trình duyệt | Playwright Chromium/Firefox/WebKit trên harness Vite từ source (`test/browser`) và fixture tarball | CI cần cài đủ ba browser engine. |
| A11y | `axe-core` (unit), `@axe-core/playwright` (trình duyệt) | Không thay kiểm thủ công NVDA/Firefox, VoiceOver/Safari. |
| Lint | ESLint flat + `typescript-eslint` + `react-hooks` + `jsx-a11y` + luật ranh giới import | INV-011. |
| Kiểm package | `publint`, `@arethetypeswrong/cli`, checker manifest/CSS/dist/bundle | INV-004…INV-006. |
| Hoãn | Changesets, API Extractor, quét license đầy đủ, publish, CI workflow | Ngoài P0. |

## 2. Bố cục file đề xuất

Các khu vực source và test của package. Exact file hiện có là tham chiếu cho lệnh kiểm tra.

```text
package.json  tsconfig.json  tsconfig.build.json  eslint.config.js  vitest.config.ts  playwright.config.ts  .gitignore
THIRD_PARTY_NOTICES.md  third_party/provenance.json
scripts/{build-css.mjs,check-package.mjs,check-css.mjs,check-dist.mjs,check-bundle.mjs,check-provenance.mjs}
src/index.ts   (root barrel có named exports)
src/types/{common.ts,index.ts}
src/lib/{cx.ts,diagnostics.ts,use-controllable-value.ts,safe-href.ts,graphemes.ts,accessible-name.ts,radio-key.ts}
src/i18n/{strings.ts,vi.ts,en.ts,resolve-strings.ts,index.ts}
src/tokens/tokens.ts
src/providers/nova/{nova-provider.tsx,theme-provider.tsx,context.ts,use-nova-theme.ts,portal-scope.tsx,index.ts}
src/components/field/{field.tsx,label.tsx,form-errors.tsx,focus-first-invalid.ts,index.ts}
src/components/{button,avatar,badge,card,link,breadcrumb,alert,data-state,input,checkbox,switch,radio-group}/
    <component>.tsx  <component>.test.tsx  index.ts
src/styles/{base.css,index.css,components/<component>.css}
test/package/*.test.ts  test/ssr/*.test.tsx  test/types/*.tsx  tsconfig.types.json
test/browser/{harness/**,*.spec.ts}
fixtures/{vite-csr,next-ssr}/**   (cài từ tarball `npm pack`, không là workspace)
```

`exports` trỏ `./<subpath>` tới `dist/components/<subpath>/index.js` (và `dist/providers/nova`, `dist/i18n`, `dist/types`). `portal-scope.tsx` không có trong `exports`.

## 3. Khu vực kiểm thử

Các case âm/biên, SSR/hydration, contrast, native form events và packaged consumers được kiểm tra theo đúng boundary. Manual screen reader, zoom và IME cần xác nhận riêng.

### Toolchain và test harness

Kiểm tra cấu hình NodeNext, unit/SSR runners, browser harness và lint. Typecheck dùng source thực; Vitest có hai project unit/SSR; Playwright có đủ Chromium/Firefox/WebKit.

### Manifest

Cases (U): `declares every P0 subpath with types+default`, `peers react/react-dom ^19.0.0 and only @base-ui/react at runtime`, `sideEffects whitelists css only`, âm: `rejects tailwindcss|antd|@angular/*|@radix-ui/*|openai|icon packs in manifest or lockfile` (manifest tổng hợp). Lệnh: `npm run test:unit -- test/package/manifest.test.ts`.

### Tokens và contrast

Cases (U): `text pairs ≥ 4.5:1 light/dark`, `control-border ≥ 3:1 vs background and surface`, `focus-ring ≥ 3:1`, `every status tone text ≥ 4.5:1 on background and tone surface`, `decorative border is not used as control boundary token`, biên `4.49:1 fails`, `generator declares vars only under :where(.nova-theme) inside nova.tokens`, `fallback map equals light values`. Lệnh: `npm run test:unit -- src/tokens`.

### CSS checker

Cases (U, fixture âm): `rejects :root/html/body`, `rejects bare element selector`, `rejects rule outside nova layers`, `rejects var(--nova-*) without matching light fallback`, `rejects custom property outside --nova-*`, `rejects declaring --nova-* outside .nova-theme`. Checker xác minh CSS đã build. Lệnh: `npm run test:unit -- scripts/check-css.test.ts`, `npm run check:css`.

### Types và utilities

Cases (U/T): safe-href theo bảng payload (`javascript:`, `JaVaScRiPt:`, ký tự điều khiển, tab chèn giữa, `data:`, `vbscript:`, tương đối, `mailto:`, `tel:`); graphemes (ZWJ emoji, dấu tổ hợp tiếng Việt, tên rỗng); controllable value (controlled `null`, `defaultValue` chỉ mount, đổi mode → diagnostic, disabled/readOnly không phát); radio-key (`1` → `n:1`, `'1'` → `s:1`, `NaN`/`±Infinity` bị từ chối, serializer tùy chỉnh trùng → lỗi xác định theo thứ tự); accessible-name (`aria-label` rỗng/khoảng trắng → lỗi cấu hình, `nameFromField` không có Field → lỗi cấu hình); diagnostics khử trùng lặp theo owner ref. T: `@ts-expect-error` cho label + aria-label, `nameFromField` kèm `description`. Lệnh: `npm run test:unit -- src/lib`, `npm run typecheck:fixtures`.

### i18n

Cases (U/T): `vi catalog for vi`, `unknown locale falls back to en per key with one diagnostic per root`, `overrides merge per namespace`, `plural {one, other} with {count}`, `never renders key names`; T: `vi`/`en` `satisfies NovaStrings`. Lệnh: `npm run test:unit -- src/i18n`.

### Provider/theme/portal

Cases (S/U/B): S `two concurrent renderToString roots dark/vi and light/en are isolated`, S `every provider module imports in node without DOM globals`; U `system: server and first client render use initialResolvedTheme`, `matchMedia listener removed on unmount`, `hydrateRoot reports 0 recoverable errors`, `nested ThemeProvider appends token classes and inherits dir/lang/strings`, `invalid timeZone falls back to UTC with diagnostic`, `portal wrapper is a new child of host and host attributes stay unchanged`, `two roots sharing a host get separate wrappers`; B `computed --nova-* in sibling roots, shared host, nested light/dark/system`, `consumer class override identical before and after hydration and inside portal`, `ancestor var without class is shadowed inside scope (documented limitation)`. Lệnh: `npm run test:ssr`, `npm run test:unit -- src/providers`, `npm run test:browser -- provider`.

### Field

Cases (U/S/B): `label click focuses the actual input`, `aria-describedby merges description, error and consumer ids without duplicates`, `required propagates as native required, marker aria-hidden`, `error sets aria-invalid`, `nameFromField outside Field renders configuration error and no input`, `empty Field label renders configuration error`, `second nameFromField control becomes configuration error and final ids are unique`, `focusFirstInvalid focuses first invalid in DOM order and returns it`, `returns null when none`, `editing without submit never moves focus`, `FormErrors links focus the field; empty list renders nothing; region is polite`; S `two Fields have unique SSR ids that hydrate`; B `required marker stays inline at 320px and 200% zoom`. Lệnh: `npm run test:unit -- src/components/field`, `npm run test:browser -- field`.

### Button

Cases (U/T/B/A): `one click emits once`, `default type does not submit`, `loading blocks mouse/Enter/Space, stays focusable with aria-busy and aria-disabled`, `disabled is native`, `render forwards props and ref to consumer button and keeps loading semantics`, `ref is HTMLButtonElement`, `IconButton empty label renders configuration error`, `ButtonGroup is a labelled group`; T `IconButton without label rejected`; B `long label wraps at 320px without covering sibling`, `coarse pointer 44×44 without overlap inside ButtonGroup`. Lệnh: `npm run test:unit -- src/components/button`, `npm run test:browser -- button`.

### Input/Textarea

Cases (U/B): `emits native value per input event without trim or normalization`, `composition events are not buffered or normalized`, `controlled update preserves caret`, `reset to empty string`, `maxLength exact boundary and paste`, `disabled does not emit`, `readOnly does not emit but stays focusable`, `native name/form/required/autoComplete reach the input`, `password toggle composition switches type, keeps value and focus, aria-pressed reflects state`, `Textarea rows defaults to 3`; B `16px font at mobile viewport`. Lệnh: `npm run test:unit -- src/components/input`.

### Checkbox/Switch

Cases (U/T/B/A): `mixed activates to true once`, `controlled false does not change DOM until prop`, `disabled Space/click do not emit`, `readOnly Space/click/label click do not emit, stays focusable`, `checked submits name=submissionValue (default on); false and mixed submit nothing`, `name/form/required/autoComplete on hidden input; ref on visible control; inputRef on hidden input`, `required unchecked invalidates form`, `focusFirstInvalid targets the visible control`; T `Switch value 'mixed' rejected`; B `forced-colors focus visible`, `coarse pointer hit area without overlap in a native fieldset list`. Lệnh: `npm run test:unit -- src/components/checkbox src/components/switch`.

### RadioGroup

Cases (U/B): `value 1 selects the numeric option, not '1'`, `default FormData n:1 and s:1`, `serializeValue output used in FormData`, `native form/autoComplete reach every radio input`, `duplicate serialized values render configuration error and no radios`, `NaN and Infinity keys render configuration error`, `unknown value selects nothing with diagnostic and no onValueChange during render`, `key 0 is selectable`, `arrows move and emit once, disabled skipped`, `RTL reverses Left/Right`, `Tab enters on checked or first enabled and leaves the group`, `readOnly Space/arrows/label click do not change selection`, `required with null invalidates form and FormData lacks name`, `nameFromField uses Field label id, merged describedby, aria-required; Field label click selects nothing`, `option ids unique across two groups`, `empty options show localized explanation without radios`. Lệnh: `npm run test:unit -- src/components/radio-group`, `npm run test:browser -- radio`.

### Badge/Card/Section

Cases (S/U/B): S `server-compatible modules have no directive and render without provider`, `0 is rendered`, `Badge has no role alert`, `headingLevel renders h2/h3/h4`, `Skeleton is aria-hidden`; B `outside provider computed colors equal light fallbacks`, `ancestor --nova-* is inherited outside provider`, `320px title and actions do not overlap`, `Tab visits only interactive children`, `tone contrast computed light/dark`. Lệnh: `npm run test:unit -- src/components/badge src/components/card`.

### Avatar

Cases (U/S): `image error shows NA and keeps size`, `grapheme initials`, `empty name shows icon with localized label`, `decorative is aria-hidden`, `src change resets failure`, `max=2 of 5 shows 2 and +3 with plural accessible text`, `non-finite or < 1 max shows all with diagnostic`; S `server and client initials match`. Lệnh: `npm run test:unit -- src/components/avatar`.

### Link/Breadcrumb

Cases (U/B): bảng payload `javascript:` → `<span>` không điều hướng, `target _blank merges rel noopener noreferrer with consumer tokens`, `nav with aria-label and ol`, `last item aria-current page without href`, `empty items render nothing`, `collapsed disclosure aria-expanded expands inline`, `renderLink only for safe hrefs`; B `RTL separators and collapsed state accessible`. Lệnh: `npm run test:unit -- src/components/link src/components/breadcrumb`.

### Alert

Cases (U/B): `live off has no live role`, `polite → status`, `assertive → alert`, `rerender keeps the same live node`, `dismiss calls onDismiss once per activation`, `never self-hides`, `action-only without name emits diagnostic`; B `title-only/action-only/body-only without blank gap at narrow width`. Lệnh: `npm run test:unit -- src/components/alert`.

### DataState/Spinner/Progress

Cases (U): `0/false children never inferred empty`, `idle renders nothing`, `initial loading has aria-busy and status, no empty`, `refreshing keeps child node identity and focus`, `empty renders Empty without retry`, `error without onRetry has no button`, `retry calls onRetry once per activation`, `retryPending true suppresses activation and keeps focus`, `repeated failure: pending false with state still error accepts a second retry`, `Spinner is a status with text`, Progress `undefined/null/NaN/±Infinity value → indeterminate without aria-valuenow`, `NaN/±Infinity/0/negative max → 100 with diagnostic`, `clamps -5 → 0 and 150 → max`, `DOM never contains NaN or Infinity`. Lệnh: `npm run test:unit -- src/components/data-state`.

### Consumer TypeScript

Cases (T): bộ `@ts-expect-error` trên `.d.ts` đóng gói với TS 5.7 và bản pin; Kiểm trường hợp `.d.ts` chưa thu hẹp đúng và `@ts-expect-error` không dùng tới. Lệnh: `npm run typecheck:fixtures`.

### Root barrel/dist

Cases (U trên dist): `client files keep 'use client' first`, `server-compatible files have no directive`, `every relative import ends in .js and resolves in Node`, `root index has no directive and no export *`, `root exports focusFirstInvalid by name`; rồi `publint`, `attw`. Lệnh: `npm run build`, `npm run test:unit -- test/package/dist.test.ts`, `npm run check:package`.

### Vite CSR/CSP

Cases (E/A): browser cases: `CSP-A has 0 securitypolicyviolation on three engines`, `theme switch changes computed background`, `checkbox and radio produce expected FormData`, `button and alert callbacks fire once`, `axe has no violations`; báo cáo CSP-B. Lệnh: `npm run smoke:pack`, `npm run test:e2e -- vite`.

### Next SSR/CSP

Cases (E): `next start pages hydrate with 0 recoverable errors and 0 console errors`, `server-compatible components render in a Server Component without client boundary`, `CSP-A with per-request nonce has 0 violations`, `system theme first paint uses media query without markup change`. Lệnh: `npm run test:e2e -- next`.

### Bundle isolation

Cases (E/U): `fixture importing ./button contains no other component module`, `single React copy`, `CSS present`. Lệnh: `npm run check:bundle`.

### Notices/provenance

Cases (U): `checker fails when a copied file lacks provenance entry or notice`. Lệnh: `npm run test:unit -- scripts/check-provenance.test.ts`.

## 4. Ánh xạ acceptance → khu vực kiểm tra

ID dossier và AC giữ nguyên; PKG-AC01…04 mô tả packaging/smoke/CSP. Các mức U/S/T/B/E/A/M phân biệt unit, SSR, typecheck, browser, packaged fixture, axe và manual.

| AC dossier | Đề xuất | Mức | Khu vực kiểm tra | Bằng chứng dự kiến |
| --- | --- | --- | --- | --- |
| S01-AC01 | AC-001 | S, U | Provider/theme/portal | Hai root dark/vi và light/en; phần toast chưa áp dụng tới S03 |
| S01-AC02 | AC-002 | S, U | Provider/theme/portal | Import node; hydrate `system` không lỗi; listener được gỡ |
| S01-AC03 | AC-003 | U, B | i18n; Provider/theme/portal | Wrapper portal giữ lớp/`dir`/`data-nova-theme`, host không đổi, computed style; key thiếu → `en` + diagnostic |
| C01-AC01 | AC-004 | U | Button | Một click một event; mặc định không submit |
| C01-AC02 | AC-005 | U, B | Button | Loading/disabled với chuột, Enter, Space |
| C01-AC03 | AC-006 | U, B, A | Button | Tên icon-only, lỗi cấu hình khi rỗng; ref; 320px |
| C03-AC01 | AC-007 | U, B | Avatar | Ảnh lỗi → “NA”, giữ kích thước |
| C03-AC02 | AC-008 | U | Avatar | Emoji ZWJ, dấu tổ hợp, tên rỗng |
| C03-AC03 | AC-009 | U, S | Avatar | Decorative `aria-hidden`; initials server = client |
| C04-AC01 | AC-010 | U | Badge/Card/Section | `0` được render |
| C04-AC02 | AC-011 | U, B | Tokens và contrast; Badge/Card/Section | Contrast từng tone light/dark; nhãn dài 320px |
| C04-AC03 | AC-012 | U | Badge/Card/Section | Không `role="alert"` mặc định |
| C05-AC01 | AC-013 | U | Badge/Card/Section | `headingLevel` → h2/h3/h4 |
| C05-AC02 | AC-014 | B, M | Badge/Card/Section | 320px và zoom 200% |
| C05-AC03 | AC-015 | B | Badge/Card/Section | Tab chỉ qua phần tử tương tác |
| C06-AC01 | AC-016 | U | Link/Breadcrumb | `aria-current="page"`, không `href="#"` |
| C06-AC02 | AC-017 | U | Types và utilities; Link/Breadcrumb | Bảng payload; `rel` |
| C06-AC03 | AC-018 | U, B, A | Link/Breadcrumb | Items rỗng; RTL; thu gọn truy cập được |
| C09-AC01 | AC-019 | U, M | Alert | Error tĩnh không assertive; rerender không announce lại |
| C09-AC02 | AC-020 | U | Alert | `onDismiss` một lần mỗi kích hoạt; không tự ẩn |
| C09-AC03 | AC-021 | U, B | Alert | Chỉ title/action/body không khoảng trống |
| C10-AC01 | AC-022 | U | DataState/Spinner/Progress | 0/false không thành empty |
| C10-AC02 | AC-023 | U | DataState/Spinner/Progress | Refresh giữ node và focus; initial load có status |
| C10-AC03 | AC-024 | U | DataState/Spinner/Progress | Progress mọi giá trị không hữu hạn; empty không retry; retry một lần mỗi kích hoạt, `retryPending`, thất bại lặp lại |
| F01-AC01 | AC-025 | U, A | Field | Click label focus input; gộp describedby |
| F01-AC02 | AC-026 | B, M | Field | Dấu bắt buộc inline ở narrow và zoom 200% |
| F01-AC03 | AC-027 | U, S | Field; Checkbox/Switch | `focusFirstInvalid` chỉ khi submit, focus control nhìn thấy; ID SSR duy nhất |
| F02-AC01 | AC-028 | U, M | Input/Textarea | Composition giả lập; gõ Telex/VNI thủ công |
| F02-AC02 | AC-029 | U | Input/Textarea | Caret giữ; reset/empty |
| F02-AC03 | AC-030 | U, B | Input/Textarea | `maxLength` biên, paste; 16px mobile; disabled |
| F05-AC01 | AC-031 | U | Checkbox/Switch | Mixed → true một lần; controlled false |
| F05-AC02 | AC-032 | U, T | Checkbox/Switch | Disabled không phát; `Switch` nhận `'mixed'` bị từ chối |
| F05-AC03 | AC-033 | T, U, A, B, M | Field; Checkbox/Switch | Thiếu tên bị TS từ chối; `nameFromField` ngoài Field → lỗi cấu hình; SR đọc mixed; contrast disabled |
| F06-AC01 | AC-034 | U, B | RadioGroup | Mũi tên, RTL, Tab, readOnly; disabled bị bỏ qua |
| F06-AC02 | AC-035 | U | Types và utilities; RadioGroup | Key 0; `1`/`'1'` chọn đúng và FormData `n:1`/`s:1`; trùng sau tuần tự → lỗi cấu hình |
| F06-AC03 | AC-036 | U, B | RadioGroup | Không option → không radio giả; required + `null` qua validation native/FormData |
| PKG-AC01 | AC-037 | E | Vite CSR/CSP; Next SSR/CSP | Tarball trong Vite CSR và Next SSR production; hydration sạch |
| PKG-AC02 | AC-038 | E | Bundle isolation | Một bản React; CSS có mặt; `./button` không kéo component khác |
| PKG-AC03 | AC-039 | U | Manifest; Root barrel/dist | Manifest/lockfile không dependency cấm; dist contract |
| PKG-AC04 | AC-040 | E | Vite CSR/CSP; Next SSR/CSP | CSP-A 0 vi phạm ba engine + test chức năng; báo cáo CSP-B |

## 5. Lệnh kiểm tra

Exact scripts ở package.json: build, typecheck, typecheck:fixtures, lint, test:unit, test:ssr, test:browser, test:e2e, check:package, check:css, check:bundle và smoke:pack. Chạy trong môi trường Node/npm của lockfile; checklist này không suy kết quả từ việc liệt kê lệnh.

## 6. Defaults kỹ thuật

| Quy tắc | Tham chiếu kỹ thuật |
|---|---|
| Bảng subpath §4; root barrel re-export có tên | §4 |
| `ThemeProvider` đổi theme, cộng dồn lớp token, kế thừa locale/dir/strings/portal | §7, §8.3 |
| `NovaStringOverrides` partial theo namespace, nhận mọi `Partial<NovaStrings>` | §4 |
| Không export `DataState<T>` ở P0 | §4 |
| Chỉ `Alert`; `Inform` ghi ở migration | §4 |
| Export `Field` với `FieldRootProps`; nhánh `nameFromField` loại `description`/`error`/`required` | §4, §11 |
| **Giữ** `nameFromField` cho RadioGroup; nhóm dùng label/description/error của Field | §11 |
| Breadcrumb thu gọn bằng disclosure inline | §6, §11 |
| `LinkProps` như §4; không tự đặt `_blank`; ép `rel` | §4, §10 |
| `AvatarGroup.max` | §4, §11 |
| Card chỉ `children`; không thêm part | §4 |
| **Khôi phục** `ButtonGroup`, `InputGroup`, `render` có kiểu; nút mật khẩu do consumer compose | §2, §4, §11 |
| `focusFirstInvalid` công khai ở `./field` + root, tiện ích DOM chỉ cho submit | §4, §7, §11 |
| P0 chỉ kiểm theme/locale/strings; phần toast chờ S03 | AC-001 |
| Bảng palette candidate đủ mọi tone | §8.4 |
| Alert `'aria-label'`; action-only thiếu tên → diagnostic | §11 |
| Ngoài provider: fallback light, không diagnostic | §7, §8.2 |
| PKG-AC01…04 | AC matrix: packaged fixtures, manifest/dist và CSP |

## 7. Các biên hành vi quan trọng

| Rủi ro | Hợp đồng hành vi | Invariant |
|---|---|---|
| Chốt retry nội bộ gây deadlock | `retryPending` do consumer sở hữu, không chốt nội bộ; ca thất bại lặp lại | INV-008 |
| Radio va chạm khóa, Checkbox trộn state với giá trị form | `===`, `n:`/`s:`, `serializeValue`, lỗi cấu hình khi trùng hoặc không hữu hạn; `submissionValue`; ref/inputRef và thuộc tính native | INV-015 |
| Mất `nameFromField` của RadioGroup, Field chưa rõ một control | Giữ `nameFromField`; Field một control, phát hiện trùng; fieldset native cho checkbox nhóm; lỗi cấu hình truy cập được; ca RTL/Tab/readOnly/required/FormData | INV-009 |
| Component ngoài provider | Fallback `var(--nova-x, light)` sinh từ nguồn token, giữ biến kế thừa, không hook chỉ để báo lỗi; lý do không bắt buộc provider | INV-006 |
| Portal mất override token, sửa host dùng chung | Lớp token qua `className`, truyền nguyên danh sách; wrapper con mới, không sửa host; giới hạn override CSS ngoài lớp; test computed style | INV-007 |
| Bỏ ButtonGroup/InputGroup/`render` tùy tiện; thiếu chữ ký | Khôi phục; chữ ký đầy đủ mọi symbol P0; giới hạn ngữ nghĩa `render`; Card không part | — |
| `focusFirstInvalid` đặt sai owner, bị gọi là hàm thuần | Owner Field, `./field` + root có tên; tiện ích DOM chỉ cho submit, không server | — |
| Lý do Tailwind sai; dựa `rewriteRelativeImportExtensions` | CSS thuần là lựa chọn đơn giản hóa; NodeNext + specifier `.js` viết sẵn; giữ directive và tree-shaking | INV-004 |
| Progress chưa xử lý vô cực | Mọi giá trị/max không hữu hạn có quy tắc; ngữ nghĩa determinate/indeterminate | — |
| CSP mơ hồ | CSP-A chính xác, owner nonce, phân biệt nonce style vs thuộc tính `style`, CSP-B report-only, test vi phạm + chức năng, không dùng dev mode | INV-014 |
| Contrast gộp viền trang trí; thiếu palette tone | Tách `control-border`; palette đủ tone light/dark; test forced-colors/reduced-motion/coarse không chồng | INV-013 |
