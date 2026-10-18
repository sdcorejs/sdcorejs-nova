# P2 — API và tích hợp local

P2 triển khai 14 dossier theo spec/architecture/plan đã duyệt. Đây là source MVP local; không phải bản đã merge, deploy hoặc publish npm. Package vẫn `private: true`, phiên bản `0.0.0`.

## Trạng thái các bản

| Bản | Trạng thái |
|---|---|
| P0 | Đã merge tại `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`; revision online không được kiểm lại trong đợt local này. |
| P1 | Commit local `83af685a76dd166f239567372efd3582ed9bbb5c`; AC-095–097 còn chờ kiểm thủ công. |
| P2 | Source local, chưa commit; bằng chứng tự động và ảnh UI được ghi riêng với các tiêu chí manual/deferred. |
| P3 | Ngoài phạm vi triển khai này. |

## Public entrypoints

Cài tarball do `npm run smoke:pack` tạo trong consumer trước khi phát hành. Import `@sdcorejs/nova/tokens.css` và `@sdcorejs/nova/styles.css` một lần. Styles P2 gồm 16 stylesheet component trong full bundle; theme, focus, locale và direction lấy từ NovaProvider.

Ví dụ TSX giả định app đã khai báo kiểu cho CSS imports của bundler. Showcase Vite dùng `types: ["vite/client"]` cùng `moduleResolution: "Bundler"`; giữ strict side-effect import checks của TypeScript 6.

Các subpath dưới đây đều có runtime và declarations. Component/hook/provider dùng được từ root, trừ adapter storage. Pure query có entrypoint riêng.

| Dossier | API chính | Subpaths sau `@sdcorejs/nova/` |
|---|---|---|
| C13 | `Splitter`, `ResizableDialog` | `splitter`, `resizable-dialog` |
| D01 | `DataTable`, `TablePagination` | `data-table` |
| D02 | `QueryBar`, `FilterPanel` | `query-bar` |
| D03 | `QueryBuilder`, `serializeQuery` | `query-builder`, `query` |
| D04 | `Tree` | `tree` |
| D05 | `FileExplorer` | `file-explorer` |
| F04 | `ColorInput` | `color-input` |
| F11 | `CalendarChips` | `calendar-chips` |
| F13 | `EntityPicker`, `TreeSelect` | `entity-picker`, `tree-select` |
| S06 | `TaskProvider`, `useTask`, `JobProgress` | `task-provider`, `task`, `job-progress` |
| S09 | `useStoredState`, `createLocalStorageAdapter` | `stored-state`, `adapters/storage` |
| U01 | `FileUpload`, `useFileTransfer` | `file-upload`, `file-transfer` |
| U02 | `ImportWizard`, `WorkbookAdapter` type | `import-wizard` |
| U03 | `ImagePreview`, `PdfPreview`, `PdfAdapter` type | `image-preview`, `pdf-preview` |

Xem declarations và các positive/negative fixtures `test/types/p2-*.tsx` để biết đầy đủ props, generic và ref target. Core không kéo workbook/PDF engine, React Hook Form hoặc Temporal vào consumer chỉ import root. Adapter storage chỉ export tại `@sdcorejs/nova/adapters/storage`.

## Dữ liệu và state

Ứng dụng sở hữu dữ liệu, phân quyền backend, router và I/O. Nova phát proposal qua callback; không tự sort/filter/page dữ liệu server hoặc thực hiện CRUD. `0` và `'0'` là hai key khác nhau; raw consumer objects đi vào cell, slot và action callback.

```tsx
import {useState} from 'react';
import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
import {NovaProvider} from '@sdcorejs/nova/theme';
import {DataTable, type Column, type TableState} from '@sdcorejs/nova/data-table';

type Row = {id: number | string; title: string};
const rows: readonly Row[] = [{id: 0, title: 'Bản ghi số'}, {id: '0', title: 'Bản ghi chuỗi'}];
const columns: readonly Column<Row>[] = [{id: 'title', header: 'Tên', cell: row => row.title}];

export function Records() {
  const [state, setState] = useState<TableState<Row['id']>>({
    page: {pageIndex: 0, pageSize: 10}, sort: [], selectedKeys: [],
  });
  return <NovaProvider locale="vi"><DataTable rows={rows} getRowKey={row => row.id}
    columns={columns} caption="Bản ghi" state={state} onStateChange={setState} total={2} />
  </NovaProvider>;
}
```

`DataTable` và `TablePagination` dùng state controlled. Khi thêm sortKey, search, filter hoặc pagination thật, app tính/fetch tập rows tương ứng rồi xác nhận proposal bằng props. `renderMobileRow` hỗ trợ trình bày mobile theo raw row. Expanded state và selection giữ key domain; loading, error, empty và retry là các trạng thái hiển thị riêng.

`QueryBar`/`FilterPanel` giữ applied business value thuộc app, draft chỉnh sửa thuộc UI. `QueryBuilder` dùng AST có ID ổn định, bounds depth/rules và validation metadata; `serializeQuery` trả dữ liệu thuần cho adapter của app, không tạo hoặc thực thi SQL. `Tree` hỗ trợ static/remote source; consumer giữ key ổn định, scope và loadChildren. `EntityPicker`/`TreeSelect` giữ raw key và nhãn chưa resolve; không đoán key từ display text.

`FileExplorer` nhận roots, controlled folder và loadChildren; scopeKey phân tách owner. Chỉ hiển thị trực tiếp children của folder hiện tại; search server là callback riêng khi cung cấp. Actions nhận `data` raw, không có transfer/CRUD ngầm. Selection controlled cần callback; view có controlled hoặc internal mode theo props tại mount. Request cũ bị abort/ignore khi owner/folder đổi; đóng preview và chooser trả focus về target còn truy cập được.

`CalendarChips` nhận `referenceDate: ISODate` bắt buộc và danh sách ISO date. Không đổi API Calendar P1. Value controlled cần handler; defaultValue dùng cho uncontrolled. Min/max/maxDates, disabled/readOnly, Field validation, native form/reset và IME được kiểm theo từng control; không suy một hành vi reset chung cho mọi component.

## Task, lưu trạng thái và truyền tệp

`TaskProvider` tạo ranh giới chia sẻ rõ ràng. `useTask` ngoài provider không chia sẻ work; các provider độc lập không dùng một singleton toàn app. Consumer cung cấp stream/transport; lifecycle cleanup ngừng subscription và bỏ kết quả cũ. `JobProgress` hiển thị trạng thái và hành động được truyền vào.

`useStoredState` nhận key, scopeKey, version, initial, adapter, encode/decode và migrate tùy chọn. SSR giữ initial/loading và không đọc localStorage; I/O bắt đầu sau mount. Thay identity tách owner, queued writes có thứ tự và late reads không ghi đè edit mới. Adapter không abortable; cleanup bỏ kết quả đến muộn, không cam kết hủy I/O đã gửi. Factory browser được import riêng:

```ts
import {useStoredState} from '@sdcorejs/nova/stored-state';
import {createLocalStorageAdapter} from '@sdcorejs/nova/adapters/storage';
```

`useFileTransfer({adapter, concurrency})` cung cấp items, enqueue, cancel, retry, download, preview và clear. Concurrency phải là số nguyên dương hữu hạn. Adapter upload nhận AbortSignal/onProgress; download tùy chọn trả `Blob | void`. Blob kết quả thuộc caller; thành công trả void có thể biểu thị browser handoff của adapter. Hủy cũng settle promise, nên consumer đọc status/outcome của item để phân biệt, không xem mọi resolved void là thành công.

`preview(id): Promise<string | undefined>` được gọi trong effect đã commit hoặc user action, không cấp object URL trong render. Queue cache URL theo attempt và sở hữu revoke đúng một lần khi clear/unmount; caller không revoke URL do queue trả về. Caller tự sở hữu object URL do chính mình tạo từ Blob download. Preview đang chờ được settle khi owner bị hủy. Retry dùng attempt mới; ID không tái sử dụng sau clear.

`Splitter` và `ResizableDialog` chỉ ghi geometry hữu hạn, clamped vào đúng panel/dialog theo bổ sung D-002. Bàn phím, pointer, focus và viewport là các đường kiểm riêng. Không nới CSP headers hay token rules để dùng geometry. Những thuộc tính style do primitive Base UI tạo được phân loại riêng trong kiểm thử.

## Workbook và PDF adapters

`ImportWizard` nhận WorkbookAdapter của app, typed columns/parse, validate, onCommit, maxRows và maxFileBytes. Mapping/review giữ snapshot; errors chặn commit, warnings cần xác nhận; partial server rejection giữ draft/issues. Abort UI không bảo đảm server chưa commit. File/mapping/owner đổi sẽ vô hiệu công việc cũ.

Showcase dùng CSV UTF-8 thực với giới hạn 4 KB/20 dòng, cột name/count. Quoting, formula và workbook không nằm trong adapter demo. Test fake adapter chỉ chứng minh orchestration; phần an toàn của workbook adapter thực trong AC-043 còn chờ bằng chứng riêng. Core không tự cài engine workbook.

`PdfPreview` nhận adapter mở document và render page vào canvas/textLayer. Adapter phải khai báo accessibleTextLayer và tạo nội dung text/alternative truy cập được; canvas-only/empty/hidden text layer dẫn đến fallback. Chuyển source/page và unmount phải abort/ignore kết quả cũ, dispose document; download/print do consumer cung cấp. Sample PDF showcase chỉ minh họa orchestration, không phải kiểm chứng parser, normal/scanned PDF hoặc screen reader. AC-048–049 còn chờ adapter/tệp thật và NVDA/VoiceOver. `ImagePreview` giữ alt, lỗi, zoom/fit/reset và hành động download tách khỏi PDF engine.

CSP fixture đóng gói hiện có img-src self data, do đó ảnh dùng owned blob URL bị trình duyệt từ chối tại gate CSP đó. Ca kiểm decode owned URL dương ở source và ca từ chối trong packed CSP là hai bằng chứng khác nhau; data URL decode không được tính là owned blob decode.

## Showcase và kiểm chứng

Routes mới `#/data`, `#/files`, `#/jobs` ghép đủ table/query/tree/picker, explorer/transfer/import/preview, task/storage. `#/forms`, `#/dates`, `#/overlays` thêm ColorInput, CalendarChips, Splitter/ResizableDialog. Sidebar VI/EN gọn, Utilities ở cuối; avatar, thông báo lưu live region và focus khi đóng bằng bàn phím của P1 được giữ.

Build trước consumer dùng dist; smoke tạo/cài tarball vào Vite CSR, Next SSR và bundle isolation. Các lệnh hiện có:

```text
npm run lint
npm run typecheck
npm run typecheck:fixtures
npm run typecheck:showcase
npm run build
npm run test:unit
npm run test:ssr
npm run test:browser
npm run check:css
npm run check:dist
npm run smoke:pack
npm run check:package
npm run check:bundle
npm run check:adapters
npm run check:provenance
npm run test:e2e
npm run build:showcase
npm run check:showcase
npm run test:showcase
npm run check:p2
npm run check:p2 -- --showcase
```

`test:showcase` chạy cả bộ P1 và P2. Bộ lệnh riêng theo validation map gồm 45 command cho 142 row automated; số test thực chạy có thể lớn hơn số row và trùng giữa focused/full runs. Checkpoint local ghi command/argv, source/config/environment fingerprints, pass/fail/skip và log gốc; không cộng các lượt trùng nhau thành độ phủ mới.

Ảnh browser thực, viewport emulation và native zoom 200% vẫn không thay thế thiết bị mobile thật, Telex/VNI hoặc screen reader. P1 AC-095–097, phần workbook thực AC-043 và P2 PDF AC-048–049 giữ pending/NOT RUN đến khi có bằng chứng đúng loại. Chưa có quyền commit P2, push, PR, merge, deploy, publish npm hoặc tag.
