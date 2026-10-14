# Nova P1 — kiến trúc

Nền: P0 commit `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`. Kiến trúc này được dùng cho triển khai local của [contract P1](p1-contract.vi.md), chưa phải bằng chứng merge hoặc phát hành. Dùng cấu trúc React/ESM hiện có, không Angular DI, service locator hoặc facade cho callback đơn giản.

## Biên giới và hướng dependency

Consumer screen → public P1/P0 components/hooks → private state/DOM/pure helpers → React/Base UI/native browser APIs. Library không import showcase; adapter engines chỉ reachable từ optional adapter subpaths. Root named exports không `export *`, không `'use client'` trên toàn barrel; interactive leaf giữ directive, pure helpers/types không DOM/module side effects. Đường dẫn `.js` trong emitted relative imports và ESM declarations theo nền P0.

`src/components/<name>` sở hữu UI/lifecycle riêng; `src/hooks/<name>` sở hữu một hook state machine; `src/providers/<name>` sở hữu queue/registry theo root. UI đi cùng hooks như BusyBoundary, CopyButton/ScrollArea được đặt dưới component tương ứng, không generic service layer. `src/lib` chỉ private helpers có reuse hoặc thuật toán đáng kiểm chứng; không tách trivial wrapper theo số dòng. Adapters đặt `src/adapters/<name>` để tsc hiện tại emit dist mà không thêm pipeline build thứ hai.

## State và request isolation

Value/draft/focus ở control; route/data/auth ở consumer. Toast/Confirm/Unsaved providers là opt-in, không NovaProvider bắt buộc cài tất cả. Không module queue/counter/cache mutable. Provider disposal settle promises/timers/listeners; two roots và StrictMode không cross-talk. Effects không tự mutation. read generation latest-wins; mutation singleflight + explicit cancel; các adapter ignore AbortSignal không được để caller treo hoặc gây unhandled late rejection.

InlineEdit giữ base revision/scope/draft, persisted-result và parent acknowledgement riêng; chưa có matching controlled props thì không close stale display. Validation result discriminated, cancelled/error khác validated empty. Unsaved registry snapshot revision/entries được reconcile sau await; dirty không tự clear, Save/Discard/Stay là dialog adapter do consumer cung cấp.

## Overlay, focus và Field

Base UI sở hữu interaction stack/focus/inert/scroll lock. Private PortalScope tạo một theme wrapper trong explicit host; Popup/Positioner không thêm portal thứ hai. Current context policy theo contract; không sửa host body/shared-container classes. ownerDocument của host/trigger phải dùng cho focus/listeners; custom container/iframe cần smoke. onCloseRequest là sync veto/proposal, cleanup chỉ khi committed close. Unmount và mobile→desktop resize phải release lock/inert, chọn reachable focus fallback.

Composite control chỉ đăng ký một Field owner. Select liên kết label với actual trigger; radiogroup/range/group dùng labelledby; range children có riêng start/end names và chung descriptions/errors, không hai nameFromField controls. Ref focus actual control, form adapter không focus decorative wrapper. Existing Field semantics giữ nguyên; private helper extension chỉ khi test mới chứng minh nhu cầu, không sửa public P0 union.

## Calendar và timezone

Nova calendar grid dùng Gregorian civil parts/parser, referenceDate explicit cho initial month/today marker và SSR snapshot. Không Date.now/local midnight/machine timezone; locale tuần vi/en, RTL/weekStart và month end clamp là contract. Native Intl chỉ format civil/instant. Chuyển wall-time→instant dùng explicit DateTimeAdapter; optional Temporal converter kiểm tra roundtrip để earlier/later chỉ nhận overlap, gap luôn error. Không global Temporal install, không heavy dependency trong basic controls/root.

## Showcase và visual boundaries

Giữ approved overall neutral layout/system font/P0 tokens/menu geometry. Public AppShell/Drawer/Navigation P1 thay consumer-local composition khi API/tests đủ, không thay business use case. Chia trang theo trách nhiệm: actions, navigation, overlays, forms, dates, feedback, utilities; mỗi trang có local state/callback có ý nghĩa, không giant kitchen-sink grid hoặc backend giả. Hash routes/basepath/skip focus/revision metadata/Pages permission boundary P0 được giữ. Unknown route không aria-current giả.

Mobile narrow một cột, controls ≥44 px, calendar một tháng, drawer cleanup khi breakpoint đổi; 200% zoom/long Vietnamese, light/dark, contrast, forced colors/RTL/reduced motion là checks riêng. Avatar visual issue vẫn open/deferred, không mô tả là đã pass/fixed.

## Bất biến kiểm chứng

1. P0 exports/types/strings defaults và local consumer contracts còn tương thích; riêng additions có declarations/packed smoke.
2. Không root/basic optional engine reachability; adapters có named subpath, actual license/provenance và tests. CSP-A enforced phải hoạt động; strict CSP-B report-only đo/classify actual positioning/consumer style attributes, không giả hidden-input-only hoặc zero violations cho overlays mới.
3. Không SSR browser reads/random IDs/clock-driven calendar markup; hydration errors bằng 0 ở fixtures.
4. Providers, promises và listeners theo instance/ownerDocument; cleanup đúng trong StrictMode/nested roots.
5. Controlled proposals không mutate/emit during render; cancellation/error không giả success.
6. Raw T/consumer actions, single-level menus; no domain CRUD/auth/router side effects.
7. Semantic labels/focus/current states/keyboard và mobile targets giữ qua composition/portal.
8. Private execution receipts/transcripts/graphs không vào public source/docs hoặc Pages build; public evidence chỉ technical facts đã kiểm chứng.

Kiểm tra invariant bằng type fixtures, real interactions, SSR/two-root/cleanup tests, packed consumers, bundle/import checks và actual public revision sau deploy. Tài liệu kỹ thuật không thay executed evidence hoặc manual visual/accessibility acceptance.
