# Kiểm tra hợp đồng thiết kế Nova

Đối chiếu tài liệu ngày 07/10/2026: React/API, async/state/SSR, accessibility và traceability. Các bảng sau là clarifications của thiết kế; không chứng nhận runtime hiện tại.

| Finding | Rủi ro cụ thể | Contract đã sửa |
|---|---|---|
| R01 — F02–F13 | Control có thể không có accessible name | AccessibleName union, explicit Field inheritance, native attrs/ref và negative fixtures. |
| R02 — F13/D04/D05 | Raw data không có key hoặc scope đổi nhưng cache vẫn cũ | getKey, scopeKey, abort/reset generation và raw typed slots. |
| R03 — U02 | Parser key/kết quả sai kiểu; không thể biểu diễn lỗi import từng dòng | Mapped union T[K], typed commit result với RowIssue, focus/error navigation theo bước. |
| R04 — D01 | Behavior cần selection/expansion/unknown total nhưng props thiếu | isRowSelectable, hasNextPage, expandedKeys/callback và slots được khai rõ. |
| R05 — S09 | Read cũ đè set mới; reset bị write cũ tái tạo key | Version envelope, local revision, generation và serialized remove sau writes đã bắt đầu. |
| R06 — S05 | Run thứ hai bỏ arguments; cancel không settle khi adapter phớt lờ signal | ActionInProgressError, abort race settle ngay, late rejection được consume. |
| R07 — S01/S02 | Formatter timezone/catalog không có owner trong API | Provider timeZone default UTC; typed catalog namespaces và hook override. |
| R08 — U03 | PDF canvas-only không thể đáp ứng screen reader | textLayer target, capability check, reading order/cleanup, fallback cho document thiếu text. |
| R09 — C11/C12 | Dialog initial focus thiếu prop; tooltip biến mất khi pointer đi vào | initialFocus + fallback/nonmodal semantics; hoverable/persistent tooltip và Escape. |
| R10 — X01/X02 | Editor label bị ép string, disabled không tới adapter | ResolvedAccessibleName và disabled được truyền tới actual editing root. |
| R11 — X05 | Schema key/kind không tương thích T | Mapped union, typed select options, date runtime validator và custom field slot. |
| R12 — S07 | Registry/provider và confirm ba lựa chọn chưa rõ | UnsavedChangesProvider public; Save/Discard/Stay adapter riêng và missing-provider contract. |
| R13 — D06 | Hai move từ cùng snapshot ghi đè nhau | Singleflight toàn board tới parent confirmation/replacement, AC hai-card concurrency. |
| R14 — X06 | maxPixels kiểm tra quá trễ; alpha JPEG policy không có API | Decode budget trước allocation/preflight; exportOptions và jpegBackground explicit. |

## Sửa provenance quan trọng

Working checkout `4db0ac9…` cũ hơn reference `c421f687…`. Inventory đã mở rộng qua root barrel **và mọi ng-package secondary**. FileExplorer base hiện có trong snapshot mới và release-associated tag/archive v2.15; không còn mô tả là feature chưa từng released. Base capabilities list/search/grid/preview/transfer được map D05/U01/U03; selector/custom columns/consumer actions/raw T là adaptation proposal, không đánh đồng với enhancement draft từ nhiệm vụ khác. Kanban/Segmented/ImageEditor/Highlight/theme được thêm vào inventory và dossier.

## Verification đã chạy

- TypeScript AST export resolver: root, secondary, named/type/local/external re-export; không có unresolved named hoặc relative resolution missing.
- Working snapshot: 866 declarations/re-exports unique theo symbol+source; reference: 936; union: 1.000, 94 capability buckets, mỗi row có disposition/rationale/spec locator và status của hai snapshot.
- Cross-version read-only probe: root/components/forms/services barrels và secondary entrypoint path parity đúng giữa v19/v20/v21/v22 ở cả hai snapshot. 91/97 entrypoints mỗi line; không thiếu entry file. Đây không phải full logic parity audit.
- Bundle structural checks: 59 dossier IDs unique, tất cả có AC01, không dangling spec references trong CSV.

`04-source-provenance.json` chứa kết quả probe. Source-tag file identity chỉ là provenance; không chứng minh declaration API/runtime đã pass build. Số union bao gồm 64 locator chỉ ở snapshot cũ, không yêu cầu Nova phục hồi những export đã mất ở reference mới.

## Giới hạn

API ngoài P0 vẫn là proposed. Source/tag/archive không thay thế xác minh npm tarball. Xem [tích hợp P0](p0-integration.vi.md) và source/tests để kiểm tra implementation hiện có.
