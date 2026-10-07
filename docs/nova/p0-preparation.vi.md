# SD Nova P0 — ghi chú chuẩn bị triển khai (r2)

> **Trạng thái: PENDING PLAN — chưa được duyệt.** Đây là đề xuất không có thẩm
> quyền để reviewer và người dùng thấy rõ phạm vi sắp duyệt. Nó **không** phải
> `plan_context`, không phải approved plan, không chứa graph phê duyệt và không
> cho phép ghi manifest, lockfile, workflow hay source. Plan chính thức chỉ được
> tạo bằng `sdcorejs-plan` sau khi có approved spec snapshot và approved
> architecture. Tách khỏi bản nháp kiến trúc vì `sdcorejs-architecture` cấm bước
> file/task trong artifact kiến trúc.

Nguồn: [bản nháp kiến trúc P0 r2](../../.sdcorejs/docs/architecture/2026-10-07-nova-p0-architecture.md) (DRAFT), [hợp đồng chung](architecture-and-conventions.vi.md) và 12 dossier P0. Mọi lệnh, script, test và RED dưới đây là **kế hoạch, chưa tồn tại và chưa chạy**; không có kết quả nào được tuyên bố.

## 1. Package và toolchain đề xuất

| Mối quan tâm | Đề xuất | Ghi chú |
|---|---|---|
| Package manager | npm + `package-lock.json` (D-016) | Default đề xuất trong gói duyệt; ghi `packageManager` sau khi chốt; không trộn. |
| Node dev/CI | `^22.12 \|\| ^24` | Chỉ ràng buộc công cụ. |
| Runtime | `@base-ui/react` duy nhất; peer `react`, `react-dom` `^19.0.0` | Pin minor sau smoke, không ghi “latest”. |
| TypeScript | Pin bản ổn định; `module`/`moduleResolution` `NodeNext`; specifier tương đối viết sẵn `.js` | Không dựa `rewriteRelativeImportExtensions`; fixture consumer kiểm TS 5.7 và bản pin (D-010). |
| Build | `tsc -p tsconfig.build.json` (ESM từng module + `.d.ts`); Lightning CSS qua `scripts/build-css.mjs`, chèn fallback light từ `src/tokens/tokens.ts` | Không bundler, không Tailwind (D-009, D-013, D-017). |
| Unit/SSR | Vitest (project `unit` jsdom, project `ssr` node) + Testing Library + `user-event` | Hydration: `renderToString` + `hydrateRoot` với `onRecoverableError`. |
| Trình duyệt | Playwright Chromium/Firefox/WebKit trên harness Vite từ source (`test/browser`) và fixture tarball | Tải trình duyệt cần mạng — xin phép riêng. |
| A11y | `axe-core` (unit), `@axe-core/playwright` (trình duyệt) | Không thay kiểm thủ công NVDA/Firefox, VoiceOver/Safari. |
| Lint | ESLint flat + `typescript-eslint` + `react-hooks` + `jsx-a11y` + luật ranh giới import | INV-011. |
| Kiểm package | `publint`, `@arethetypeswrong/cli`, checker manifest/CSS/dist/bundle | INV-004…INV-006. |
| Hoãn | Changesets, API Extractor, quét license đầy đủ, publish, CI workflow | Ngoài P0. |

## 2. Bố cục file đề xuất

Theo cấu trúc candidate của spec (fallback greenfield, chưa có convention trong repo).

```text
package.json  tsconfig.json  tsconfig.build.json  eslint.config.js  vitest.config.ts  playwright.config.ts  .gitignore
THIRD_PARTY_NOTICES.md  third_party/provenance.json
scripts/{build-css.mjs,check-package.mjs,check-css.mjs,check-dist.mjs,check-bundle.mjs,check-provenance.mjs}
src/index.ts   (TASK-001 tạo scaffold `export {};`; TASK-019 EDIT thành root barrel)
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

## 3. Quy tắc TDD trung thực

Áp dụng `_refs/shared/tdd.md` và yêu cầu “TDD đầy đủ” của người dùng:

1. **RED trước production.** Với mỗi task có mã production, viết ca hành vi trước, chạy lệnh hẹp nhất, xác nhận thất bại **do hành vi vắng/sai**. Lỗi import, compile, cấu hình runner, thiếu dependency là blocker, không phải RED.
2. **Scaffold chữ ký.** Để RED thất bại ở assertion thay vì import, được phép tạo file export đúng chữ ký nhưng không có hành vi được test (component trả `null`, map token rỗng, hàm trả giá trị trung tính). Scaffold được ghi riêng trong ledger và không chứa logic của ca đang test.
3. **GREEN cùng ca.** Chỉ viết mã tối thiểu cho ca đó, chạy lại **đúng** ca và lệnh đó.
4. **Refactor + chạy lại assertion không đổi.** Assertion của ca đã RED được đóng băng: diff file test giữa RED, GREEN và refactor chỉ được *thêm* ca mới. Sửa assertion nghĩa là đổi hợp đồng → dừng, ghi lý do, xin duyệt; không được viết lại test để có GREEN giả.
5. **Âm và biên trước.** Ca âm/biên (rỗng, `0`, `NaN`, `±Infinity`, trùng khóa, payload `javascript:`, disabled/readOnly) nằm trong lô RED, không viết sau mã.
6. **Không RED nhân tạo.** Task bootstrap (cấu hình runner, tsconfig) không có test thất bại giả; bằng chứng là *harness sẵn sàng* (§4, TASK-001). CSS/token/contrast/selector/tương tác/trình duyệt dùng test đúng bản chất (checker có fixture âm, computed style, hình học) thay cho unit RED giả.
7. **Ledger.** Mỗi ca ghi `RED-TASK-0NN-<slug>`, `GREEN-…`, `REFACTOR-…` với lệnh, kết quả, HEAD/diff theo `tdd_cycle`; mức **M** (thủ công) báo cáo tách biệt.

## 4. Đồ thị task TDD đề xuất

Thực hiện tuần tự (một coder). Mỗi dòng “RED” là danh sách ca viết trước; lệnh dùng `<pm>` = package manager đã duyệt. Mức: **U** unit jsdom, **S** SSR node, **T** typecheck fixture, **B** trình duyệt harness, **E** fixture tarball, **A** axe, **M** thủ công.

**TASK-001 — Harness bootstrap (không RED).** `package.json` tối thiểu (devDependencies, scripts), `tsconfig*.json` NodeNext, `vitest.config.ts` (unit + ssr), `playwright.config.ts` + `test/browser/harness`, `eslint.config.js`, `.gitignore`, và scaffold harness `src/index.ts` chỉ chứa `export {};` (không chức năng, không export product, không phải RED; chỉ tạo khi thực thi đã được duyệt, không tạo bây giờ). Bằng chứng sẵn sàng: `<pm> run typecheck` thoát 0 trên `src` chỉ gồm scaffold đó; `vitest list` hiện hai project; `playwright --version`. Không tạo test giả.

**TASK-002 — Hợp đồng manifest** (001). RED (U): `declares every P0 subpath with types+default`, `peers react/react-dom ^19.0.0 and only @base-ui/react at runtime`, `sideEffects whitelists css only`, âm: `rejects tailwindcss|antd|@angular/*|@radix-ui/*|openai|icon packs in manifest or lockfile` (manifest tổng hợp). RED vì manifest bootstrap chưa có các trường. Lệnh: `<pm> run test:unit -- test/package/manifest.test.ts`.

**TASK-003 — Nguồn token và contrast** (001). RED (U): `text pairs ≥ 4.5:1 light/dark`, `control-border ≥ 3:1 vs background and surface`, `focus-ring ≥ 3:1`, `every status tone text ≥ 4.5:1 on background and tone surface`, `decorative border is not used as control boundary token`, biên `4.49:1 fails`, `generator declares vars only under :where(.nova-theme) inside nova.tokens`, `fallback map equals light values`. Scaffold: map token rỗng. Lệnh: `<pm> run test:unit -- src/tokens`.

**TASK-004 — Checker CSS và base CSS** (003). RED (U, fixture âm): `rejects :root/html/body`, `rejects bare element selector`, `rejects rule outside nova layers`, `rejects var(--nova-*) without matching light fallback`, `rejects custom property outside --nova-*`, `rejects declaring --nova-* outside .nova-theme`. Sau đó chạy checker trên CSS đã build. Lệnh: `<pm> run test:unit -- scripts/check-css.test.ts`, `<pm> run check:css`.

**TASK-005 — Types chung và helper private** (001). RED (U/T): safe-href theo bảng payload (`javascript:`, `JaVaScRiPt:`, ký tự điều khiển, tab chèn giữa, `data:`, `vbscript:`, tương đối, `mailto:`, `tel:`); graphemes (ZWJ emoji, dấu tổ hợp tiếng Việt, tên rỗng); controllable value (controlled `null`, `defaultValue` chỉ mount, đổi mode → diagnostic, disabled/readOnly không phát); radio-key (`1` → `n:1`, `'1'` → `s:1`, `NaN`/`±Infinity` bị từ chối, serializer tùy chỉnh trùng → lỗi xác định theo thứ tự); accessible-name (`aria-label` rỗng/khoảng trắng → lỗi cấu hình, `nameFromField` không có Field → lỗi cấu hình); diagnostics khử trùng lặp theo owner ref. T: `@ts-expect-error` cho label + aria-label, `nameFromField` kèm `description`. Lệnh: `<pm> run test:unit -- src/lib`, `<pm> run typecheck:fixtures`.

**TASK-006 — i18n** (005). RED (U/T): `vi catalog for vi`, `unknown locale falls back to en per key with one diagnostic per root`, `overrides merge per namespace`, `plural {one, other} with {count}`, `never renders key names`; T: `vi`/`en` `satisfies NovaStrings`. Lệnh: `<pm> run test:unit -- src/i18n`.

**TASK-007 — Provider và portal private** (004, 005, 006). RED (S/U/B): S `two concurrent renderToString roots dark/vi and light/en are isolated`, S `every provider module imports in node without DOM globals`; U `system: server and first client render use initialResolvedTheme`, `matchMedia listener removed on unmount`, `hydrateRoot reports 0 recoverable errors`, `nested ThemeProvider appends token classes and inherits dir/lang/strings`, `invalid timeZone falls back to UTC with diagnostic`, `portal wrapper is a new child of host and host attributes stay unchanged`, `two roots sharing a host get separate wrappers`; B `computed --nova-* in sibling roots, shared host, nested light/dark/system`, `consumer class override identical before and after hydration and inside portal`, `ancestor var without class is shadowed inside scope (documented limitation)`. Lệnh: `<pm> run test:ssr`, `<pm> run test:unit -- src/providers`, `<pm> run test:browser -- provider`.

**TASK-008 — Field, Label, FormErrors, focusFirstInvalid** (007). RED (U/S/B): `label click focuses the actual input`, `aria-describedby merges description, error and consumer ids without duplicates`, `required propagates as native required, marker aria-hidden`, `error sets aria-invalid`, `nameFromField outside Field renders configuration error and no input`, `empty Field label renders configuration error`, `second nameFromField control becomes configuration error and final ids are unique`, `focusFirstInvalid focuses first invalid in DOM order and returns it`, `returns null when none`, `editing without submit never moves focus`, `FormErrors links focus the field; empty list renders nothing; region is polite`; S `two Fields have unique SSR ids that hydrate`; B `required marker stays inline at 320px and 200% zoom`. Lệnh: `<pm> run test:unit -- src/components/field`, `<pm> run test:browser -- field`.

**TASK-009 — Button, IconButton, ButtonGroup** (007). RED (U/T/B/A): `one click emits once`, `default type does not submit`, `loading blocks mouse/Enter/Space, stays focusable with aria-busy and aria-disabled`, `disabled is native`, `render forwards props and ref to consumer button and keeps loading semantics`, `ref is HTMLButtonElement`, `IconButton empty label renders configuration error`, `ButtonGroup is a labelled group`; T `IconButton without label rejected`; B `long label wraps at 320px without covering sibling`, `coarse pointer 44×44 without overlap inside ButtonGroup`. Lệnh: `<pm> run test:unit -- src/components/button`, `<pm> run test:browser -- button`.

**TASK-010 — Input, Textarea, InputGroup** (008). RED (U/B): `emits native value per input event without trim or normalization`, `composition events are not buffered or normalized`, `controlled update preserves caret`, `reset to empty string`, `maxLength exact boundary and paste`, `disabled does not emit`, `readOnly does not emit but stays focusable`, `native name/form/required/autoComplete reach the input`, `password toggle composition switches type, keeps value and focus, aria-pressed reflects state`, `Textarea rows defaults to 3`; B `16px font at mobile viewport`. Lệnh: `<pm> run test:unit -- src/components/input`.

**TASK-011 — Checkbox, Switch** (008). RED (U/T/B/A): `mixed activates to true once`, `controlled false does not change DOM until prop`, `disabled Space/click do not emit`, `readOnly Space/click/label click do not emit, stays focusable`, `checked submits name=submissionValue (default on); false and mixed submit nothing`, `name/form/required/autoComplete on hidden input; ref on visible control; inputRef on hidden input`, `required unchecked invalidates form`, `focusFirstInvalid targets the visible control`; T `Switch value 'mixed' rejected`; B `forced-colors focus visible`, `coarse pointer hit area without overlap in a native fieldset list`. Lệnh: `<pm> run test:unit -- src/components/checkbox src/components/switch`.

**TASK-012 — RadioGroup** (008). RED (U/B): `value 1 selects the numeric option, not '1'`, `default FormData n:1 and s:1`, `serializeValue output used in FormData`, `native form/autoComplete reach every radio input`, `duplicate serialized values render configuration error and no radios`, `NaN and Infinity keys render configuration error`, `unknown value selects nothing with diagnostic and no onValueChange during render`, `key 0 is selectable`, `arrows move and emit once, disabled skipped`, `RTL reverses Left/Right`, `Tab enters on checked or first enabled and leaves the group`, `readOnly Space/arrows/label click do not change selection`, `required with null invalidates form and FormData lacks name`, `nameFromField uses Field label id, merged describedby, aria-required; Field label click selects nothing`, `option ids unique across two groups`, `empty options show localized explanation without radios`. Lệnh: `<pm> run test:unit -- src/components/radio-group`, `<pm> run test:browser -- radio`.

**TASK-013 — Badge, Card, CardGroup, Section, SectionItem, Empty, Skeleton** (004, 005). RED (S/U/B): S `server-compatible modules have no directive and render without provider`, `0 is rendered`, `Badge has no role alert`, `headingLevel renders h2/h3/h4`, `Skeleton is aria-hidden`; B `outside provider computed colors equal light fallbacks`, `ancestor --nova-* is inherited outside provider`, `320px title and actions do not overlap`, `Tab visits only interactive children`, `tone contrast computed light/dark`. Lệnh: `<pm> run test:unit -- src/components/badge src/components/card`.

**TASK-014 — Avatar, AvatarGroup** (007). RED (U/S): `image error shows NA and keeps size`, `grapheme initials`, `empty name shows icon with localized label`, `decorative is aria-hidden`, `src change resets failure`, `max=2 of 5 shows 2 and +3 with plural accessible text`, `non-finite or < 1 max shows all with diagnostic`; S `server and client initials match`. Lệnh: `<pm> run test:unit -- src/components/avatar`.

**TASK-015 — Link, Breadcrumb** (007). RED (U/B): bảng payload `javascript:` → `<span>` không điều hướng, `target _blank merges rel noopener noreferrer with consumer tokens`, `nav with aria-label and ol`, `last item aria-current page without href`, `empty items render nothing`, `collapsed disclosure aria-expanded expands inline`, `renderLink only for safe hrefs`; B `RTL separators and collapsed state accessible`. Lệnh: `<pm> run test:unit -- src/components/link src/components/breadcrumb`.

**TASK-016 — Alert** (009). RED (U/B): `live off has no live role`, `polite → status`, `assertive → alert`, `rerender keeps the same live node`, `dismiss calls onDismiss once per activation`, `never self-hides`, `action-only without name emits diagnostic`; B `title-only/action-only/body-only without blank gap at narrow width`. Lệnh: `<pm> run test:unit -- src/components/alert`.

**TASK-017 — DataState, Spinner, Progress** (009, 013). RED (U): `0/false children never inferred empty`, `idle renders nothing`, `initial loading has aria-busy and status, no empty`, `refreshing keeps child node identity and focus`, `empty renders Empty without retry`, `error without onRetry has no button`, `retry calls onRetry once per activation`, `retryPending true suppresses activation and keeps focus`, `repeated failure: pending false with state still error accepts a second retry`, `Spinner is a status with text`, Progress `undefined/null/NaN/±Infinity value → indeterminate without aria-valuenow`, `NaN/±Infinity/0/negative max → 100 with diagnostic`, `clamps -5 → 0 and 150 → max`, `DOM never contains NaN or Infinity`. Lệnh: `<pm> run test:unit -- src/components/data-state`.

**TASK-018 — Fixture TypeScript consumer** (008–017). RED (T): bộ `@ts-expect-error` trên `.d.ts` đóng gói với TS 5.7 và bản pin; RED khi `.d.ts` chưa thu hẹp đúng (ví dụ `@ts-expect-error` không dùng tới). Lệnh: `<pm> run typecheck:fixtures`.

**TASK-019 — Root barrel và dist contract** (008–017). EDIT `src/index.ts` (scaffold `export {};` của TASK-001): ca RED viết và chạy trước khi thay scaffold bằng export có tên. RED (U trên dist): `client files keep 'use client' first`, `server-compatible files have no directive`, `every relative import ends in .js and resolves in Node`, `root index has no directive and no export *`, `root exports focusFirstInvalid by name`; rồi `publint`, `attw`. Lệnh: `<pm> run build`, `<pm> run test:unit -- test/package/dist.test.ts`, `<pm> run check:package`.

**TASK-020 — Fixture Vite CSR production + CSP** (019). Thiết lập fixture là harness (không RED giả). RED (E/A): spec Playwright viết trước khi nối trang: `CSP-A has 0 securitypolicyviolation on three engines`, `theme switch changes computed background`, `checkbox and radio produce expected FormData`, `button and alert callbacks fire once`, `axe has no violations`; báo cáo CSP-B. Lệnh: `<pm> run smoke:pack`, `<pm> run test:e2e -- vite`.

**TASK-021 — Fixture Next SSR production + nonce** (019). RED (E): `next start pages hydrate with 0 recoverable errors and 0 console errors`, `server-compatible components render in a Server Component without client boundary`, `CSP-A with per-request nonce has 0 violations`, `system theme first paint uses media query without markup change`. Lệnh: `<pm> run test:e2e -- next`.

**TASK-022 — Cô lập bundle** (020, 021). RED (E/U): `fixture importing ./button contains no other component module`, `single React copy`, `CSS present`. Lệnh: `<pm> run check:bundle`.

**TASK-023 — Notice và provenance shadcn** (008–017). RED (U): `checker fails when a copied file lacks provenance entry or notice`. Lệnh: `<pm> run test:unit -- scripts/check-provenance.test.ts`.

**Cần duyệt riêng, ngoài trình tự:** `.github/workflows/**`, `README.md` gốc, tài liệu sử dụng/migration. File dùng chung (`package.json`, lockfile, `src/index.ts`, `src/styles/index.css`, `THIRD_PARTY_NOTICES.md`) chỉ sửa ở TASK-001/002/019/023.

## 5. Ánh xạ AC → test

ID dossier là tham chiếu gốc và **không đổi**; cột `AC-###` chỉ là ánh xạ bổ sung đề xuất, `sdcorejs-spec` gán ID chính thức (có thể đánh số toàn cục cho 188 AC) — việc cơ học, không phải lựa chọn của người dùng. PKG-AC01…04 là AC bổ sung, rút từ yêu cầu packaging/smoke/CSP của hợp đồng chung.

| AC dossier | Đề xuất | Mức | Task | Bằng chứng dự kiến |
|---|---|---|---|---|
| S01-AC01 | AC-001 | S, U | 007 | Hai root dark/vi và light/en; phần toast chưa áp dụng tới S03 |
| S01-AC02 | AC-002 | S, U | 007 | Import node; hydrate `system` không lỗi; listener được gỡ |
| S01-AC03 | AC-003 | U, B | 006, 007 | Wrapper portal giữ lớp/`dir`/`data-nova-theme`, host không đổi, computed style; key thiếu → `en` + diagnostic |
| C01-AC01 | AC-004 | U | 009 | Một click một event; mặc định không submit |
| C01-AC02 | AC-005 | U, B | 009 | Loading/disabled với chuột, Enter, Space |
| C01-AC03 | AC-006 | U, B, A | 009 | Tên icon-only, lỗi cấu hình khi rỗng; ref; 320px |
| C03-AC01 | AC-007 | U, B | 014 | Ảnh lỗi → “NA”, giữ kích thước |
| C03-AC02 | AC-008 | U | 014 | Emoji ZWJ, dấu tổ hợp, tên rỗng |
| C03-AC03 | AC-009 | U, S | 014 | Decorative `aria-hidden`; initials server = client |
| C04-AC01 | AC-010 | U | 013 | `0` được render |
| C04-AC02 | AC-011 | U, B | 003, 013 | Contrast từng tone light/dark; nhãn dài 320px |
| C04-AC03 | AC-012 | U | 013 | Không `role="alert"` mặc định |
| C05-AC01 | AC-013 | U | 013 | `headingLevel` → h2/h3/h4 |
| C05-AC02 | AC-014 | B, M | 013 | 320px và zoom 200% |
| C05-AC03 | AC-015 | B | 013 | Tab chỉ qua phần tử tương tác |
| C06-AC01 | AC-016 | U | 015 | `aria-current="page"`, không `href="#"` |
| C06-AC02 | AC-017 | U | 005, 015 | Bảng payload; `rel` |
| C06-AC03 | AC-018 | U, B, A | 015 | Items rỗng; RTL; thu gọn truy cập được |
| C09-AC01 | AC-019 | U, M | 016 | Error tĩnh không assertive; rerender không announce lại |
| C09-AC02 | AC-020 | U | 016 | `onDismiss` một lần mỗi kích hoạt; không tự ẩn |
| C09-AC03 | AC-021 | U, B | 016 | Chỉ title/action/body không khoảng trống |
| C10-AC01 | AC-022 | U | 017 | 0/false không thành empty |
| C10-AC02 | AC-023 | U | 017 | Refresh giữ node và focus; initial load có status |
| C10-AC03 | AC-024 | U | 017 | Progress mọi giá trị không hữu hạn; empty không retry; retry một lần mỗi kích hoạt, `retryPending`, thất bại lặp lại |
| F01-AC01 | AC-025 | U, A | 008 | Click label focus input; gộp describedby |
| F01-AC02 | AC-026 | B, M | 008 | Dấu bắt buộc inline ở narrow và zoom 200% |
| F01-AC03 | AC-027 | U, S | 008, 011 | `focusFirstInvalid` chỉ khi submit, focus control nhìn thấy; ID SSR duy nhất |
| F02-AC01 | AC-028 | U, M | 010 | Composition giả lập; gõ Telex/VNI thủ công |
| F02-AC02 | AC-029 | U | 010 | Caret giữ; reset/empty |
| F02-AC03 | AC-030 | U, B | 010 | `maxLength` biên, paste; 16px mobile; disabled |
| F05-AC01 | AC-031 | U | 011 | Mixed → true một lần; controlled false |
| F05-AC02 | AC-032 | U, T | 011 | Disabled không phát; `Switch` nhận `'mixed'` bị từ chối |
| F05-AC03 | AC-033 | T, U, A, B, M | 008, 011 | Thiếu tên bị TS từ chối; `nameFromField` ngoài Field → lỗi cấu hình; SR đọc mixed; contrast disabled |
| F06-AC01 | AC-034 | U, B | 012 | Mũi tên, RTL, Tab, readOnly; disabled bị bỏ qua |
| F06-AC02 | AC-035 | U | 005, 012 | Key 0; `1`/`'1'` chọn đúng và FormData `n:1`/`s:1`; trùng sau tuần tự → lỗi cấu hình |
| F06-AC03 | AC-036 | U, B | 012 | Không option → không radio giả; required + `null` qua validation native/FormData |
| PKG-AC01 | AC-037 | E | 020, 021 | Tarball trong Vite CSR và Next SSR production; hydration sạch |
| PKG-AC02 | AC-038 | E | 022 | Một bản React; CSS có mặt; `./button` không kéo component khác |
| PKG-AC03 | AC-039 | U | 002, 019 | Manifest/lockfile không dependency cấm; dist contract |
| PKG-AC04 | AC-040 | E | 020, 021 | CSP-A 0 vi phạm ba engine + test chức năng; báo cáo CSP-B |

## 6. Lệnh kiểm chứng dự kiến (chưa tồn tại)

`build` (`build:js`, `build:css`), `typecheck`, `typecheck:fixtures`, `lint`, `test:unit`, `test:ssr`, `test:browser`, `test:e2e`, `check:package`, `check:css`, `check:dist`, `check:bundle`, `smoke:pack`. Tên chốt trong plan theo manifest thật; không lệnh nào đã chạy.

## 7. Giải quyết Q-01…Q-18 (default đề xuất, không phải bảng hỏi)

| ID | Default | Vị trí (mục Kiến trúc, trừ khi ghi khác) |
|---|---|---|
| Q-01 | Bảng subpath §4; root barrel re-export có tên | §4 |
| Q-02 | `ThemeProvider` đổi theme, cộng dồn lớp token, kế thừa locale/dir/strings/portal | §7, §8.3 |
| Q-03 | `NovaStringOverrides` partial theo namespace, nhận mọi `Partial<NovaStrings>` | §4 |
| Q-04 | Không export `DataState<T>` ở P0 | §4 |
| Q-05 | Chỉ `Alert`; `Inform` ghi ở migration | §4 |
| Q-06 | Export `Field` với `FieldRootProps`; nhánh `nameFromField` loại `description`/`error`/`required` | §4, §11 |
| Q-07 | **Giữ** `nameFromField` cho RadioGroup; nhóm dùng label/description/error của Field | §11 |
| Q-08 | Breadcrumb thu gọn bằng disclosure inline | §6, §11 |
| Q-09 | `LinkProps` như §4; không tự đặt `_blank`; ép `rel` | §4, §10 |
| Q-10 | `AvatarGroup.max` | §4, §11 |
| Q-11 | Card chỉ `children`; không thêm part | §4 |
| Q-12 | **Khôi phục** `ButtonGroup`, `InputGroup`, `render` có kiểu; nút mật khẩu do consumer compose | §2, §4, §11 |
| Q-13 | `focusFirstInvalid` công khai ở `./field` + root, tiện ích DOM chỉ cho submit | §4, §7, §11 |
| Q-14 | P0 chỉ kiểm theme/locale/strings; phần toast chờ S03 | Chuẩn bị §5 (AC-001) |
| Q-15 | Bảng palette candidate đủ mọi tone | §8.4 |
| Q-16 | Alert `'aria-label'`; action-only thiếu tên → diagnostic | §11 |
| Q-17 | Ngoài provider: fallback light, không diagnostic | §7, §8.2 |
| Q-18 | PKG-AC01…04 | §13 VAL-002, VAL-007; Chuẩn bị §5 |

## 8. Phát hiện review Sol/Astra đã xử lý

“Kiến trúc” = file `.sdcorejs/docs/architecture/2026-10-07-nova-p0-architecture.md`; “Chuẩn bị” = file này.

| # | Phát hiện | Cách giải quyết | Vị trí |
|---|---|---|---|
| 1 | Chốt retry nội bộ gây deadlock | `retryPending` do consumer sở hữu, không chốt nội bộ; ca thất bại lặp lại | Kiến trúc §4, §6, §11, INV-008; Chuẩn bị TASK-017, AC-024 |
| 2 | Radio va chạm khóa, Checkbox trộn state với giá trị form | `===`, `n:`/`s:`, `serializeValue`, lỗi cấu hình khi trùng hoặc không hữu hạn; `submissionValue`; ref/inputRef và thuộc tính native | Kiến trúc §4, §11, INV-015; Chuẩn bị TASK-005/011/012 |
| 3 | Mất `nameFromField` của RadioGroup, Field chưa rõ một control | Giữ `nameFromField`; Field một control, phát hiện trùng; fieldset native cho checkbox nhóm; lỗi cấu hình truy cập được; ca RTL/Tab/readOnly/required/FormData | Kiến trúc §11, D-019, INV-009; Chuẩn bị TASK-008/012 |
| 4 | Component ngoài provider | Fallback `var(--nova-x, light)` sinh từ nguồn token, giữ biến kế thừa, không hook chỉ để báo lỗi; lý do không bắt buộc provider | Kiến trúc D-017, §7, §8.2, INV-006 |
| 5 | Portal mất override token, sửa host dùng chung | Lớp token qua `className`, truyền nguyên danh sách; wrapper con mới, không sửa host; giới hạn override CSS ngoài lớp; test computed style | Kiến trúc §8.3, INV-007; Chuẩn bị TASK-007 |
| 6 | Bỏ ButtonGroup/InputGroup/`render` tùy tiện; thiếu chữ ký | Khôi phục; chữ ký đầy đủ mọi symbol P0; giới hạn ngữ nghĩa `render`; Card không part | Kiến trúc §2, §4, §11 |
| 7 | `focusFirstInvalid` đặt sai owner, bị gọi là hàm thuần | Owner Field, `./field` + root có tên; tiện ích DOM chỉ cho submit, không server | Kiến trúc §4, §7, §11; Chuẩn bị TASK-008/019 |
| 8 | Lý do Tailwind sai; dựa `rewriteRelativeImportExtensions` | CSS thuần là lựa chọn đơn giản hóa; NodeNext + specifier `.js` viết sẵn; giữ directive và tree-shaking | Kiến trúc D-009, D-010, INV-004; Chuẩn bị §1, TASK-019 |
| 9 | Progress chưa xử lý vô cực | Mọi giá trị/max không hữu hạn có quy tắc; ngữ nghĩa determinate/indeterminate | Kiến trúc §11; Chuẩn bị TASK-017 |
| 10 | CSP mơ hồ | CSP-A chính xác, owner nonce, phân biệt nonce style vs thuộc tính `style`, CSP-B report-only, test vi phạm + chức năng, không dùng dev mode | Kiến trúc D-018, §9, INV-014, A-004/005; Chuẩn bị TASK-020/021, AC-040 |
| 11 | Contrast gộp viền trang trí; thiếu palette tone | Tách `control-border`; palette đủ tone light/dark; test forced-colors/reduced-motion/coarse không chồng | Kiến trúc §8.4, INV-013; Chuẩn bị TASK-003/009/011 |
| 12 | 18 câu hỏi rời rạc | Default ở §7; gói duyệt §9; giữ 59 dossier/188 AC, ánh xạ bổ sung; không graph giả | Chuẩn bị §5, §7, §9; Kiến trúc §0, §14 |
| TDD | Yêu cầu “TDD đầy đủ” | Quy tắc RED/GREEN/refactor, scaffold, đóng băng assertion, bootstrap không RED giả, ca RED cụ thể mỗi task | Chuẩn bị §3, §4 |

## 9. Tổng quan để duyệt kiến trúc và plan

**Đã được duyệt (không hỏi lại):** mục tiêu P0, commit/push và publish spec, vai trò Opus/Sol/Astra, yêu cầu làm spec/plan cẩn thận với TDD đầy đủ.

**Kế thừa từ spec:** React 19, shadcn/ui + Base UI, thẩm mỹ neutral, một package với subpath exports, CSS biên dịch với biến semantic, các type chung (`ValueProps`, `AccessibleName`…), 12 dossier P0 và AC gốc.

**Mới được cụ thể hóa trong bản này:** chữ ký đầy đủ của mọi symbol P0 (gồm `ButtonGroup`, `InputGroup`, `render` của Button, `AvatarGroup.max`, `retryPending`, `serializeValue`, `submissionValue`, `focusFirstInvalid`); lỗi cấu hình truy cập được thay vì control vô danh; mã hóa giá trị radio `n:`/`s:`; quy tắc Progress cho mọi giá trị không hữu hạn; token fallback ngoài provider và lớp token đi theo portal; palette đủ tone.

**Build:** CSS thuần + Lightning CSS (không Tailwind, vì đơn giản), `tsc` NodeNext với specifier `.js` viết sẵn, ESM từng module giữ `'use client'`, npm + lockfile, Node 22.12+/24 cho dev.

**Giới hạn SSR/CSS/CSP:** theme `system` tô bằng media query, `resolvedTheme` chỉ đúng sau mount; ngoài provider chỉ có light, không RTL bàn phím; override token phải khai theo lớp truyền qua `className` mới đi theo portal; CSP-A yêu cầu `style-src-attr 'unsafe-inline'`, không hỗ trợ `style-src-attr 'none'` ở P0; CSP dev mode không phải bằng chứng.

**Đồ thị TDD:** 001 bootstrap → 002 manifest → 003 token → 004 CSS; 005 helper → 006 i18n → 007 provider → 008 Field → 010/011/012 control; 007 → 009 Button → 016 Alert, 017 DataState; 013 hiển thị, 014 Avatar, 015 Link → 018 type → 019 dist → 020 Vite + CSP, 021 Next + nonce → 022 bundle; 023 provenance. Mỗi task có RED cụ thể trước mã.

**Ngoài phạm vi:** P1/P2/P3, overlay/toast công khai, RHF adapter, Section collapse, CI, release/publish.

**Cần người dùng duyệt (một lần, theo nhóm):**

1. API công khai và packaging: bảng subpath, chữ ký §4 kiến trúc, lỗi cấu hình truy cập được, giá trị form radio `n:`/`s:`, Card không part, React 19 only, 0.x chưa publish.
2. Theme/CSS/CSP: CSS thuần, fallback light ngoài provider không bắt buộc provider, lớp token qua `className` và giới hạn portal, palette candidate, hồ sơ CSP-A và giới hạn `style-src-attr`.
3. Toolchain và quyền: npm + lockfile, danh sách devDependencies, quyền mạng để cài dependency và trình duyệt Playwright.
4. Plan: 23 task tuần tự với quy tắc TDD §3.

**Việc cơ học (không hỏi người dùng):** gán `AC-###`/`INV-###`/`A-###`, dựng `decision_coverage`, ánh xạ AC §5, nối exports, tạo snapshot và hash bằng helper, chạy lại `classifyArchitectureGate`/`resolveArchitectureOwner`/`validateArchitectureContext`/`verifyApprovedArtifactGraph`, dựng `plan_context` và goal-backward review.
