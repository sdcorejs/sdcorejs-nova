# SD Nova — bộ spec review r1

Core UI React độc lập cho trang end user, package đề xuất `@sdcorejs/nova`, nền shadcn/Base UI và visual tokens neutral riêng. Đây là tài liệu thiết kế; repo chưa chứa implementation hoặc framework scaffold. Tài liệu chưa được coi là approved contract.

Đọc theo thứ tự:

1. [Kiến trúc candidate và conventions](architecture-and-conventions.vi.md): packaging, tokens, a11y, i18n, SSR, state và release gates.
2. Các spec cá thể trong mục lục dưới: API TypeScript, ví dụ, behavior và AC/testcases.
3. [Inventory CSV](02-inventory.csv) / [export graph JSON](inventory.json): 1.000 union symbol+source, 94 capability buckets, disposition và provenance hai snapshot.
4. [Review độc lập](03-review.vi.md) và [source verification](04-source-provenance.json).

Source provenance: working HEAD `4db0ac9…` và reference `c421f687…` khác nhau. FileExplorer base có trong reference/release-associated v2.15 source archive; selector/custom columns/typed raw consumer actions là Nova adaptation proposals. Không suy npm publication chỉ từ manifest/tag; independent tarball verification bị môi trường chặn.

## Ưu tiên

- P0: tokens/exports/CSS/SSR smoke → provider → primitives → Field và controls cơ bản.
- P1: overlays/actions → forms/validation/date/selection → feedback/async → shell/navigation và lifecycle hooks.
- P2: table/query/tree/entity/file/import/preview/task theo nhu cầu ứng dụng đầu tiên.
- P3: editors/org chart/audit/history/schema renderer/Kanban/ImageEditor khi có usecase rõ.

Defaults chờ review: React 19 trước; CSS biên dịch sẵn; một package với subpath exports; adapters nặng optional; app sở hữu data/auth/router/actions. Không cần hỏi lại quyết định React, shadcn/Base UI và hướng visual đã chấp thuận.

## Mục lục 59 spec

| ID | Spec | Phase |
|---|---|---|
| C01 | [Button / IconButton](specs/C01.vi.md) | P0 |
| C02 | [ActionMenu / QuickActions](specs/C02.vi.md) | P1 |
| C03 | [Avatar / AvatarGroup](specs/C03.vi.md) | P0 |
| C04 | [Badge](specs/C04.vi.md) | P0 |
| C05 | [Card / CardGroup / Section](specs/C05.vi.md) | P0 |
| C06 | [Breadcrumb / Link](specs/C06.vi.md) | P0 |
| C07 | [Tabs / TabPanel](specs/C07.vi.md) | P1 |
| C08 | [Stepper](specs/C08.vi.md) | P1 |
| C09 | [Alert / Inform](specs/C09.vi.md) | P0 |
| C10 | [DataState / Empty / Skeleton / Spinner / Progress](specs/C10.vi.md) | P0 |
| C11 | [Dialog / Sheet / Drawer](specs/C11.vi.md) | P1 |
| C12 | [Popover / Tooltip](specs/C12.vi.md) | P1 |
| C13 | [ResizableDialog / Splitter](specs/C13.vi.md) | P2 |
| C14 | [AppShell / Sidebar / Navigation](specs/C14.vi.md) | P1 |
| C15 | [ReadOnlyValue / View](specs/C15.vi.md) | P1 |
| C16 | [AnchorNavigation / AnchorSection](specs/C16.vi.md) | P1 |
| C17 | [CollapsibleSection / Accordion](specs/C17.vi.md) | P1 |
| C18 | [Highlight / findHighlightRanges](specs/C18.vi.md) | P1 |
| D01 | [DataTable / TablePagination](specs/D01.vi.md) | P2 |
| D02 | [QueryBar / FilterPanel / OperatorSelect](specs/D02.vi.md) | P2 |
| D03 | [QueryBuilder / serializeQuery](specs/D03.vi.md) | P2 |
| D04 | [Tree / TreeItem](specs/D04.vi.md) | P2 |
| D05 | [FileExplorer (existing base + Nova adaptations)](specs/D05.vi.md) | P2 |
| D06 | [Kanban](specs/D06.vi.md) | P3 |
| F01 | [Field / Label / FormErrors](specs/F01.vi.md) | P0 |
| F02 | [Input / Textarea](specs/F02.vi.md) | P0 |
| F03 | [NumberInput](specs/F03.vi.md) | P1 |
| F04 | [ColorInput](specs/F04.vi.md) | P2 |
| F05 | [Checkbox / Switch](specs/F05.vi.md) | P0 |
| F06 | [RadioGroup](specs/F06.vi.md) | P0 |
| F07 | [Select / Combobox / Autocomplete](specs/F07.vi.md) | P1 |
| F08 | [MultiSelect / ChipInput](specs/F08.vi.md) | P1 |
| F09 | [DatePicker / DateRangePicker / Calendar](specs/F09.vi.md) | P1 |
| F10 | [TimeInput / TimeRangeInput / DateTimePicker](specs/F10.vi.md) | P1 |
| F11 | [CalendarChips](specs/F11.vi.md) | P2 |
| F12 | [InlineEdit](specs/F12.vi.md) | P1 |
| F13 | [TreeSelect / EntityPicker](specs/F13.vi.md) | P2 |
| F14 | [useFormValidation / RHF adapter](specs/F14.vi.md) | P1 |
| F15 | [InlineText](specs/F15.vi.md) | P1 |
| F16 | [SegmentedControl](specs/F16.vi.md) | P1 |
| S01 | [NovaProvider / ThemeProvider / useNovaTheme](specs/S01.vi.md) | P0 |
| S02 | [useFormatter / i18n strings](specs/S02.vi.md) | P1 |
| S03 | [ToastProvider / useToast](specs/S03.vi.md) | P1 |
| S04 | [ConfirmProvider / useConfirm](specs/S04.vi.md) | P1 |
| S05 | [useAsyncAction / BusyBoundary](specs/S05.vi.md) | P1 |
| S06 | [useTask / TaskProvider / JobProgress](specs/S06.vi.md) | P2 |
| S07 | [useUnsavedChanges / Navigation adapter](specs/S07.vi.md) | P1 |
| S08 | [useViewport / useMediaQuery](specs/S08.vi.md) | P1 |
| S09 | [useStoredState / PersistenceAdapter](specs/S09.vi.md) | P2 |
| S10 | [CopyButton / useClipboard / ScrollArea](specs/S10.vi.md) | P1 |
| U01 | [FileUpload / useFileTransfer](specs/U01.vi.md) | P2 |
| U02 | [ImportWizard / workbook adapter](specs/U02.vi.md) | P2 |
| U03 | [ImagePreview / PdfPreview](specs/U03.vi.md) | P2 |
| X01 | [RichTextEditor / MiniEditor](specs/X01.vi.md) | P3 |
| X02 | [CodeEditor](specs/X02.vi.md) | P3 |
| X03 | [OrgChart](specs/X03.vi.md) | P3 |
| X04 | [AuditDiff / HistoryTimeline](specs/X04.vi.md) | P3 |
| X05 | [SchemaFormRenderer (optional)](specs/X05.vi.md) | P3 |
| X06 | [ImageEditor](specs/X06.vi.md) | P3 |

## Trạng thái xác minh

59 dossier, 188 acceptance cases; 60 snippet TypeScript/TSX qua kiểm tra cú pháp. Review API/design độc lập đã xử lý blocker trong phạm vi kiểm tra. Inventory có disposition cho mọi row và không dangling spec references. Barrels/secondary path parity được kiểm tra giữa v19–v22 ở cả hai snapshots.

Chưa có Nova implementation nên chưa semantic typecheck, runtime tests, Next/Vite smoke hoặc screen-reader/visual tests. Các kiểm tra đó là acceptance requirements. Không đưa credential, runtime scratch, Angular source snapshot, Library transfer helper hoặc ZIP duplicate vào repo.
