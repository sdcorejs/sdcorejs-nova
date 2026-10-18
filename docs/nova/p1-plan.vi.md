# Nova P1 — lộ trình kỹ thuật đề xuất

Nền P0: `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`. Phạm vi gồm đủ **26 dossier / 80 AC**, không cắt một số controls để coi phần còn lại là P2. API có triển khai local, chưa merge/publish; xem [contract](p1-contract.vi.md) và [kiến trúc](p1-architecture.vi.md).

## Thứ tự theo dependencies

1. S02, S08, S05, C18, C15, F15.
2. C11, C12, C17.
3. C02, C07, C08, F16, C16, S10.
4. S03, S04.
5. F03, F07, F08, F09, F10, F12, F14.
6. C14, S07.

Nhóm trên là thứ tự tích hợp, không yêu cầu tạo abstraction cho mọi dependency. C17/C07 chỉ reuse common lifecycle khi có interaction thực; CSS-first layouts không bắt buộc gọi useViewport. Các unit source/test/types/style theo responsibility, compound parts cùng module khi hợp lý. Hook UI như BusyBoundary, CopyButton/ScrollArea có component entry riêng. Calendar/pure helpers không import overlay hoặc optional engine.

## Component ownership và AC

| Dossier | Dependencies | Source owner | AC nền |
|---|---|---|---|
| [S02](specs/S02.vi.md) — Formatter và i18n | — | `src/hooks/formatter/formatter.tsx` | S02-AC01, S02-AC02, S02-AC03 |
| [S08](specs/S08.vi.md) — Viewport và media query | — | `src/hooks/viewport/viewport.tsx` | S08-AC01, S08-AC02, S08-AC03 |
| [S05](specs/S05.vi.md) — Async action và BusyBoundary | — | `src/hooks/async-action/async-action.tsx` | S05-AC01, S05-AC02, S05-AC03, S05-AC04 |
| [C18](specs/C18.vi.md) — Highlight an toàn | — | `src/components/highlight/highlight.tsx` | C18-AC01, C18-AC02, C18-AC03 |
| [C15](specs/C15.vi.md) — ReadOnlyValue và View | S02 | `src/components/read-only-value/read-only-value.tsx` | C15-AC01, C15-AC02, C15-AC03 |
| [F15](specs/F15.vi.md) — InlineText | — | `src/components/inline-text/inline-text.tsx` | F15-AC01, F15-AC02, F15-AC03 |
| [C11](specs/C11.vi.md) — Dialog, Sheet và Drawer | — | `src/components/dialog/dialog.tsx` | C11-AC01, C11-AC02, C11-AC03 |
| [C12](specs/C12.vi.md) — Popover và Tooltip | C11 | `src/components/popover/popover.tsx` | C12-AC01, C12-AC02, C12-AC03, C12-AC04 |
| [C17](specs/C17.vi.md) — Accordion và CollapsibleSection | — | `src/components/accordion/accordion.tsx` | C17-AC01, C17-AC02, C17-AC03 |
| [C02](specs/C02.vi.md) — ActionMenu và QuickActions | C11, C12, S05 | `src/components/action-menu/action-menu.tsx` | C02-AC01, C02-AC02, C02-AC03 |
| [C07](specs/C07.vi.md) — Tabs và TabPanel | — | `src/components/tabs/tabs.tsx` | C07-AC01, C07-AC02, C07-AC03 |
| [C08](specs/C08.vi.md) — Stepper | — | `src/components/stepper/stepper.tsx` | C08-AC01, C08-AC02, C08-AC03 |
| [F16](specs/F16.vi.md) — SegmentedControl | — | `src/components/segmented-control/segmented-control.tsx` | F16-AC01, F16-AC02, F16-AC03 |
| [C16](specs/C16.vi.md) — AnchorNavigation và AnchorSection | S08 | `src/components/anchor-navigation/anchor-navigation.tsx` | C16-AC01, C16-AC02, C16-AC03 |
| [S10](specs/S10.vi.md) — Clipboard, CopyButton và ScrollArea | C12 | `src/hooks/clipboard/clipboard.tsx` | S10-AC01, S10-AC02, S10-AC03 |
| [S03](specs/S03.vi.md) — ToastProvider và useToast | C11, S05 | `src/providers/toast/toast.tsx` | S03-AC01, S03-AC02, S03-AC03 |
| [S04](specs/S04.vi.md) — ConfirmProvider và useConfirm | C11 | `src/providers/confirm/confirm.tsx` | S04-AC01, S04-AC02, S04-AC03 |
| [F03](specs/F03.vi.md) — NumberInput | S02 | `src/components/number-input/number-input.tsx` | F03-AC01, F03-AC02, F03-AC03 |
| [F07](specs/F07.vi.md) — Select, Combobox và Autocomplete | C12 | `src/components/select/select.tsx` | F07-AC01, F07-AC02, F07-AC03 |
| [F08](specs/F08.vi.md) — MultiSelect và ChipInput | F07 | `src/components/multi-select/multi-select.tsx` | F08-AC01, F08-AC02, F08-AC03 |
| [F09](specs/F09.vi.md) — DatePicker, DateRangePicker và Calendar | C12, S02 | `src/components/date-picker/date-picker.tsx` | F09-AC01, F09-AC02, F09-AC03 |
| [F10](specs/F10.vi.md) — TimeInput, TimeRangeInput và DateTimePicker | F09, S02 | `src/components/time-input/time-input.tsx` | F10-AC01, F10-AC02, F10-AC03 |
| [F12](specs/F12.vi.md) — InlineEdit và controlled commit | C15, F15, S05 | `src/components/inline-edit/inline-edit.tsx` | F12-AC01, F12-AC02, F12-AC03 |
| [F14](specs/F14.vi.md) — Validation và RHF adapter | F03, F07, F08, F09, F10, F15, F16, S05 | `src/hooks/form-validation/form-validation.tsx` | F14-AC01, F14-AC02, F14-AC03 |
| [C14](specs/C14.vi.md) — AppShell, Sidebar và Navigation | C11, S08, C02 | `src/components/app-shell/app-shell.tsx` | C14-AC01, C14-AC02, C14-AC03 |
| [S07](specs/S07.vi.md) — UnsavedChanges và navigation adapter | C11, S05, F12 | `src/providers/unsaved-changes/unsaved-changes.tsx` | S07-AC01, S07-AC02, S07-AC03 |

Mỗi source module có co-located interaction tests, `test/types/p1-<name>.tsx`, `test/ssr/p1-<name>.test.tsx`, browser spec/scenario. Pure helpers dùng node tests và không tạo browser fixture không có UI. Adapter có package/type/packed tests riêng; build pipeline tsc hiện tại emit src/adapters, không thêm build engine.

## Hợp đồng validation

Mỗi AC có positive/negative/boundary cases, automated proof theo đúng behavior; manual keyboard/screen-reader/IME/visual observations được ghi riêng. Test failure phải chứng minh behavior trước sửa; module chưa tồn tại chỉ là bootstrap failure, không thay behavioral regression evidence. Không fake prior failure logs. Sau focused TDD, broad gates chạy một lần trên final frozen source; chỉ lặp khi source/failure/risk mới đòi hỏi.

- Type/declarations: invalid unions, nested actions >1 level, raw generic T, null/0/false và adapter peer boundaries.
- Interaction: controlled prop acknowledgement, disabled/readOnly, reset/native submission, composition/caret, selected/current/focus semantics, mobile keyboard.
- Async: deferred promises/out-of-order, cancel/reset/superseded/unmount, ignored signals, late rejection, concurrent FIFO/one invocation, revision/scope conflicts.
- SSR: all public subpaths import no browser globals; render/hydrate deterministic calendar/provider roots, no hydration warnings; StrictMode listeners/timers/RAF/observer/body-lock cleanup.
- Browser/visual: Chromium/Firefox/WebKit, desktop/mobile light/dark/RTL, viewport edges, 44 px targets, 200% zoom, long Vietnamese, contrast/forced colors/reduced motion. Browser automation không chứng minh manual screen-reader acceptance.
- CSP: fixture CSP-A enforced không script/style-element violation; strict CSP-B report-only ghi actual Base UI positioning/hidden input và explicit consumer style/maxHeight, không nới header để giả pass.
- Packaging: tarball named exports, clean root/basic consumer without optional peers, adapters with exact peers, root graph/tree-shaking không kéo RHF/Temporal/jsbi; CSS layers/fallbacks và upstream notices đúng actual installed/build inventory.

## Các lệnh có sẵn và nghĩa vụ bổ sung

Npm/package-lock hiện là package manager đã phát hiện. Các scripts có sẵn: `npm run typecheck`, `npm run typecheck:fixtures`, `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:ssr`, `npm run test:browser`, `npm run test:e2e`, `npm run check:css`, `npm run check:package`, `npm run check:bundle`, `npm run check:provenance`, `npm run smoke:pack`, `npm run typecheck:showcase`, `npm run build:showcase`, `npm run check:showcase`, `npm run test:showcase`. Danh sách này là planned verification, chưa có kết quả P1.

Focused tests dùng runner đã cài và exact test paths. Optional peer fixture versions/provenance/license phải kiểm tra trước manifest/lock writes; clean packed consumers là proof required, không chỉ node_modules hoisting. Fixture manifests/locks được cập nhật có chủ đích để nhận tarball/peer mới, giữ Node/React baseline. Kiểm tra package private/version/license giữ nguyên. Public Pages chỉ publish built allowlisted artifact, revision/source clean SHA, permissions workflow P0 không mở rộng sang npm.

## Public technical deliverables

Public code/docs chỉ mô tả API, technical rationale, examples và kết quả đã kiểm chứng. Tài liệu này không chứa private approval/process/session references. Basic/root adapter absence, SSR/lifecycle, source hash và public revision có evidence độc lập. P1 kết thúc sau review và public deployment đúng revision; npm tag/release vẫn tách và deferred. Avatar visual issue ngoài scope, open/deferred.

## Kiểm chứng bản local tích hợp

Phạm vi source của 26 dossier có unit tests, public type fixtures (TS 6 và TS 5.7), SSR tests và browser scenario/spec. Consumer production dùng tarball, không alias source. `test/e2e/p1-adapters.spec.ts` kiểm tra payload native (ngày civil, midnight, 0, key có prefix và repeated values), RHF first-error focus/raw values, Temporal DST gap, InlineEdit acknowledgement, Sidebar hydration và state qua breakpoint trên Vite/Next. Next còn render Highlight/View trong Server Component.

Các gate cuối phải chạy trên cùng source; số pass/fail/skip và SHA/diff được báo từ log thực tế:

```sh
npm run lint
npm run typecheck
npm run typecheck:fixtures
npm run typecheck:showcase
npm run build
npm run test:unit
npm run test:ssr
npm run test:browser -- --workers=2
npm run smoke:pack
npm run test:e2e -- --workers=2
npm run check:css
npm run check:package
npm run check:bundle
npm run check:adapters
npm run check:provenance
npm run build:showcase
npm run check:showcase
npm run test:showcase
```

Smoke giữ tarball trong thư mục riêng mỗi run, kiểm tra core runtime và TS 6/5.7 không cài optional peers, rồi build bundle-isolation/Vite/Next. Optional peers được kiểm tra vắng cả từ consumer resolver và Nova resolver; adapter exports và declaration graph không được leak vào root.

Review độc lập đã kiểm tra core, packaging và showcase; các lỗi phát hiện được sửa với test RED/GREEN. Gate không coi file tồn tại hoặc marker passed là chức năng hoàn tất. Public workflows không thay đổi; test artifact chỉ normalize CRLF/LF trước mutation và xác nhận mutation thực sự xảy ra.

Nghiệm thu manual vẫn cần ghi quan sát thật và owner acknowledgement: NVDA/Firefox, VoiceOver/Safari, Telex/VNI thật và bàn phím mobile, review UI cuối desktop/mobile light/dark. Browser composition events, axe, screenshot và emulated viewport không thay thế các mục này. Avatar P0 còn giữ trạng thái review riêng; P1 không mở rộng sửa P0. Chưa push, PR, merge, deploy, publish npm hoặc tag version.
