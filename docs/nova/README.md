# SD Nova — bộ spec review r1

Core UI React độc lập cho trang end user, package đề xuất `@sdcorejs/nova`, nền shadcn/Base UI và visual tokens neutral riêng. Đây là bộ tài liệu thiết kế. Phạm vi P0 (12 dossier) đã được triển khai và kiểm cục bộ nhưng P0 này chưa được publish; xem [hướng dẫn tích hợp P0](p0-integration.vi.md). P1 hiện có triển khai local và consumer examples, đang hoàn tất kiểm chứng; xem [contract P1](p1-contract.vi.md) và [phạm vi/kiểm chứng P1](p1-plan.vi.md). P1 chưa merge/publish; P2/P3 tiếp tục là đề xuất.

Đọc theo thứ tự:

1. [Kiến trúc P0](p0-architecture.vi.md) và [kiến trúc candidate/conventions](architecture-and-conventions.vi.md): packaging, tokens, a11y, i18n, SSR, state và release gates.
2. Các spec cá thể trong mục lục dưới: API TypeScript, ví dụ, behavior và AC/testcases.
3. [Inventory CSV](02-inventory.csv) / [export graph JSON](inventory.json): 1.000 union symbol+source, 94 capability buckets, disposition và provenance hai snapshot.
4. [Review độc lập](03-review.vi.md) và [source verification](04-source-provenance.json).

Source provenance: working HEAD `4db0ac9…` và reference `c421f687…` khác nhau. FileExplorer base có trong reference/release-associated v2.15 source archive; selector/custom columns/typed raw consumer actions là Nova adaptation proposals. Không suy npm publication chỉ từ manifest/tag; source provenance không thay thế xác minh tarball.

## Ưu tiên

- P0: tokens/exports/CSS/SSR smoke → provider → primitives → Field và controls cơ bản.
- P1: overlays/actions → forms/validation/date/selection → feedback/async → shell/navigation và lifecycle hooks.
- P2: table/query/tree/entity/file/import/preview/task theo nhu cầu ứng dụng đầu tiên.
- P3: editors/org chart/audit/history/schema renderer/Kanban/ImageEditor khi có usecase rõ.

Conventions P0: React 19 trước; CSS biên dịch sẵn; một package với subpath exports; adapters nặng optional; app sở hữu data/auth/router/actions.

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

Với P0, typecheck ngữ nghĩa (TypeScript 6.0.3 và 5.7.3), test unit, SSR, trình duyệt ba engine và smoke production Vite/Next đã chạy cục bộ; kiểm thủ công trình đọc màn hình, zoom 200% và gõ Telex/VNI chưa được xác nhận. P1 đang được triển khai cục bộ và chưa xuất bản; P2, P3 còn là proposal. Các kiểm tra đó là acceptance requirements.

Showcase consumer Vite/Pages đã có menu gọn với selected/hover/focus riêng; CI và deployment/public revision cần xác nhận bằng run thực tế. Xem [hướng dẫn showcase](showcase-pages.vi.md). npm release tiếp tục hoãn đến sau P1/P2 và review, owner tự đánh version tag.

## Portal của overlay P1

Dialog, Sheet và Drawer dùng một primitive portal của Base UI bên trong scope Nova riêng. Popover và Tooltip cũng dùng primitive portal; nhánh portal riêng của P0 giữ cách hoạt động hiện tại. Scope áp dụng theme, class, `dir` và `lang` lên wrapper mới, không ghi các thuộc tính theme vào host của consumer.

Overlay ở cấp gốc dùng `NovaProvider.portalContainer` khi được cung cấp. Overlay lồng nhau cùng owner nằm trong subtree của primitive portal cha. Khi có modal cha đang hoạt động, container chỉ định riêng được dùng nếu nằm trong subtree của modal đó. Container bên ngoài subtree sẽ được thay bằng host bên trong modal cha để popup con vẫn truy cập được và không phá focus trap hoặc inert. Trường hợp này có diagnostic cấu hình `NOVA_NESTED_PORTAL_CONTAINER` trong development; container ngoài được yêu cầu **không được dùng** trong lúc modal cha còn mở.

Cha nonmodal cho phép container ngoài độc lập. Nếu cần modal con trong một host ngoài hoặc iframe độc lập, consumer đóng modal cha rồi mở overlay cấp gốc tại host đó. Focus owner theo `popup.ownerDocument` thực tế. Đóng hoặc đổi host phải dọn wrapper, khôi phục focus vào opener/return target còn truy cập được và trả lại các marker/scroll-lock do primitive quản lý.

Các overlay P1 đang được triển khai và kiểm tra cục bộ. Hình học responsive, positioning khi scroll, keyboard trong browser, CSP, packed exports và kiểm thử production vẫn là các yêu cầu cần xác minh trước khi coi P1 hoàn tất.

Popover nhận một trigger element duy nhất. Intrinsic `<button>` và component trả native button (gồm Nova Button) dùng native button mode. Intrinsic element khác dùng button semantics của primitive ngay từ SSR. Với custom component trả element non-native, consumer khai báo `role="button"` trên element truyền vào và forward toàn bộ primitive props/ref tới DOM; khai báo này chọn non-native mode. Nova không tự suy DOM output của một React component bất kỳ. Consumer handlers, ref và accessible name được giữ khi compose; Enter/Space của non-native trigger kích hoạt một lần.

Wrapper delegate tạo stacking context riêng bằng CSS `display: block` (thay `display: contents` của scope), `position: relative`, `isolation: isolate` và base layer 1000. Backdrop dùng local slot 0; popup/positioner dùng local slot 1. Wrapper của overlay con nằm trong subtree cha và ở trên local surfaces của cha; không cần inline depth counter hoặc thay đổi modal trap. Quy tắc này nằm trong full Nova stylesheet; wrapper portal P0 không nhận marker/style của overlay delegate. Pixel overlap và hit testing cần được xác minh bằng browser thực tế.

Bảo đảm stacking nội bộ nói trên áp dụng khi overlay con dùng host mặc định trong subtree của **primitive cha trực tiếp**. Với container ngoài riêng hoặc nhánh host tùy chỉnh, consumer phải bảo đảm các ancestor không đặt overlay dưới stacking context khác, không clip nội dung và không tạo document boundary ngoài khả năng modal mong muốn. Nova giữ container đã chỉ định trong trường hợp được hỗ trợ; không bảo đảm paint order bất kỳ giữa các host tùy chỉnh. Chính sách fallback khi có modal ancestor đang hoạt động vẫn áp dụng. Nếu cần modal độc lập ở host khác, đóng cha rồi mở root overlay là luồng rõ ràng hơn. Kể cả default nesting, paint/hit testing chỉ được xác nhận sau browser check thực tế với stylesheet P1 đã build.

### Tabs và compound wrappers trong P1

Fallback SSR của Tabs duyệt các parts trực tiếp, Fragment và container HTML; nó không chạy hoặc duyệt nội dung của component custom có ownership chưa biết. Với TabList/TabPanel bên trong opaque wrapper, truyền `value` hoặc `defaultValue` hợp lệ để server chọn đúng nội dung ngay từ đầu. Khi thiếu initial value ở cấu trúc opaque, các parts đăng ký sau mount để chọn fallback; không phát callback lựa chọn ngầm. Nested Tabs giữ selection và IDs riêng.

Sau mount, registry của mỗi root nhận snapshot đã commit và cập nhật thứ tự DOM của các tab đã đăng ký, kể cả consumer reorder keyed elements được memoize. Observer thuộc document của root, được disconnect khi owner đổi hoặc unmount; kiểm tra equality tránh cập nhật state vì mutation không đổi các tab của root. Controlled value thiếu tab chỉ đổi fallback trình bày, không ghi lại state của consumer.

### Điều hướng section trong P1

`AnchorNavigation` giữ `href="#id"` để browser điều hướng khi JavaScript chưa chạy. Khi JavaScript hoạt động, click thường hoặc Enter đưa focus vào heading của `AnchorSection` và cuộn theo `offsetPx`; `updateHash` mặc định `false`, nên không thay hash router của ứng dụng. Modified click giữ hành vi native. Khi thiếu IntersectionObserver, scrollspy không hoạt động nhưng click vẫn hỗ trợ focus và offset; cập nhật hash cần opt-in.

ID phải duy nhất trong document và target phải thuộc scroll root đã chọn. Target thiếu giữ native href cùng diagnostic; JavaScript không điều hướng tới một target mơ hồ hoặc sửa URL để che lỗi cấu hình. Với HTML do consumer tự dựng, heading cần focusable (`tabIndex={-1}`); Nova không sửa thuộc tính heading bên ngoài. Observer dùng document/window của scroll root, cleanup khi root hoặc section thay đổi; scrolling không ghi history. `AnchorSection` cung cấp heading có tên và điểm focus ổn định. CSS hỗ trợ TOC dạng danh sách trên màn hình hẹp; browser/AT acceptance vẫn cần kiểm chứng khi tích hợp bản P1.

## Clipboard và vùng cuộn

`useClipboard().copy(text)` được gọi từ thao tác người dùng; mount, hover và SSR không ghi clipboard. Lần gọi thứ hai khi đang pending trả `false` ngay. Cleanup khi unmount kết thúc lời chờ tại UI và tiếp nhận kết quả muộn; nó không hủy thao tác ghi clipboard của trình duyệt. Khi quyền bị từ chối hoặc API không có, `CopyButton` hiển thị thông báo an toàn và văn bản thuần có thể chọn để sao chép thủ công.

`ScrollArea` dùng overflow native. Sau layout, chỉ vùng thực sự có overflow mới nhận tên region và điểm Tab; markup SSR không đoán kích thước. Observer thuộc document của vùng cuộn và được cleanup khi unmount. `maxHeight` là giá trị CSS do consumer cung cấp: chỉ khi được truyền mới có inline `max-height`; consumer cần tính riêng chính sách CSP cho style này. Xem [API P1](p1-contract.vi.md) và source [clipboard](../../src/hooks/clipboard/clipboard.tsx), [CopyButton](../../src/components/copy-button/copy-button.tsx), [ScrollArea](../../src/components/scroll-area/scroll-area.tsx).

## Toast và quyền sở hữu thông báo

`ToastProvider` cung cấp `useToast()` với `show`, `update` và `dismiss`. Mỗi provider giữ queue riêng theo FIFO; mặc định hiển thị tối đa 5 thông báo, phần còn lại chờ đến khi có chỗ. Cùng `id` cập nhật thông báo hiện có, kể cả đang chờ; cập nhật ID không tồn tại hoặc đã dismiss trả `false`, không tạo lại thông báo.

Thông báo mặc định hết hạn sau 5000 ms; `durationMs: null` giữ đến khi consumer dismiss. Hover, focus trong vùng thông báo, document bị ẩn và action đang chạy tạm dừng thời gian còn lại. Cập nhật nội dung giữ elapsed time; chỉ patch `durationMs` rõ ràng mới đặt lại duration. `maxVisible` dương hữu hạn được làm tròn xuống, tối thiểu 1; giá trị không hợp lệ dùng mặc định 5. Duration không hợp lệ dùng 5000 ms, giá trị 0 hết hạn ngay khi timer có thể chạy.

Action nhận `LoadContext.signal`, chạy một lần khi pending và giữ focus. Thành công mở lại action và tiếp tục timer; consumer quyết định dismiss, không ngầm đóng thông báo. Dismiss, thay action hoặc unmount abort invocation đang chờ và bỏ qua kết quả cũ. Lỗi giữ thông báo; `onActionError` chỉ trả chuỗi an toàn để hiển thị, nếu thiếu hoặc throw thì dùng thông báo lỗi đã dịch, không đưa exception vào DOM.

Theme, locale, direction và portal container thuộc Nova scope gần nhất **tại ToastProvider**, không thuộc một scope lồng chỉ quanh invoker. Khi cần scope khác, đặt một ToastProvider tương ứng. Context updates áp dụng cho thông báo hiện có; các provider độc lập không dùng chung queue hoặc timer. `announcement` mặc định polite; assertive là lựa chọn rõ ràng của consumer. Thông báo assertive dùng live alert riêng và native keyboard focus vào thông báo để truy cập action/close.

CSS dùng semantic tokens hiện có, close/action có hit target tối thiểu 44 px và viewport có safe-area inset. `offset` là CSS string do consumer sở hữu, đưa vào inline custom property `--nova-toast-offset`; consumer phải tính chính sách CSP phù hợp khi cung cấp nó. Các checks source/unit/SSR không thay thế kiểm tra browser, screen reader, clipping/stacking của custom host hoặc cách screen reader thực tế đọc live announcement.

## ConfirmProvider và quyết định của consumer

`useConfirm()` trả hàm nhận `ConfirmOptions` và một promise với kết quả `confirmed` hoặc `cancelled`. Chỉ nút xác nhận rõ ràng mới trả `confirmed`; Cancel, Escape, backdrop click, signal abort và provider unmount trả `cancelled`. Provider không nhận hoặc chạy destructive callback. Consumer kiểm tra kết quả rồi tự thực hiện thao tác nghiệp vụ.

Requests giữ FIFO riêng cho từng provider, không dedupe theo title. Abort request đang chờ không hiển thị nó; abort request hiện tại chuyển sang request tiếp theo. Mỗi invocation chụp options và signal, gỡ listener của đúng signal khi settle, và settle tối đa một lần. API giữ lại sau unmount trả `cancelled`; gọi trong SSR cũng trả `cancelled` kèm diagnostic cấu hình tĩnh, không đọc DOM hay để promise pending.

Prompt dùng modal AlertDialog public primitive với explicit backdrop cancellation. Danger tập trung Cancel khi mở; neutral tập trung Confirm. Focus trở lại invoker còn reachable khi queue kết thúc, không trả focus ra ngoài giữa hai request FIFO. Nếu invoker đã biến mất, provider chọn một target reachable trong document thực tế của popup. Title trống bị từ chối bằng `cancelled` và diagnostic; labels trống dùng bản dịch mặc định. Title, description và labels luôn là plain text.

Theme, locale, direction và portal container lấy từ Nova scope gần nhất tại ConfirmProvider. Context updates áp dụng cho prompt đang mở, không thay quyết định đang chờ. Các constraints modal nesting/custom host của phần Portal vẫn áp dụng. Prompt dùng full Nova stylesheet (dialog geometry, isolation và confirm controls), giữ controls tối thiểu 44 px và wrap labels dài. Source keyboard/SSR checks không thay thế browser paint, mobile geometry hay screen-reader acceptance.

### NumberInput — draft số và native form

`NumberInput` giữ draft văn bản riêng với model `number | null`. Locale lấy từ NovaProvider, hoặc prop `locale` cho parser/format; tên nút và lỗi vẫn do catalog của provider sở hữu. Parser kiểm tra grouping/thập phân theo locale, không đoán chuỗi trộn separator; dấu âm hoặc thập phân cuối còn được sửa tiếp, IME chỉ đề xuất giá trị khi composition kết thúc. Chuỗi trống đề xuất `null`; NaN, Infinity và draft ngoài min/max không cập nhật model. Draft không hợp lệ giữ nguyên khi blur, có mô tả lỗi liên kết và native custom validity chặn submit, không clamp ngầm. Value controlled ngoài range vẫn được hiển thị như prop và báo invalid, không phát callback sửa value.

ArrowUp/ArrowDown và hai nút bước dùng NumberField public của Base UI; bước được giới hạn bởi min/max, wheel không đổi số khi cuộn trang. Draft hiển thị do Nova sở hữu; không truyền tùy chọn rounding vào primitive để giữ cleanup precision của bước số. Đây là số JavaScript, không phải cam kết tiền tệ chính xác; consumer dùng adapter decimal/string khi cần. Input ref trỏ input chỉnh sửa thực, Field label/description/error/required vẫn giữ một control owner. Props native như `form`, autoComplete, inputMode và handlers được compose; handler preventDefault được giữ. Một native numeric input của primitive sở hữu payload canonical với `name`/`form`; input draft không tạo payload trùng. Uncontrolled reset trả default tại mount mà không callback, reset bị hủy không đổi draft; listener/timer bị tháo khi đổi form hoặc unmount. Controlled model tiếp tục thuộc consumer.

Dùng đầy đủ stylesheet Nova, gồm input và number-input. Hai nút có kích thước hit target semantic, input kế thừa font/focus/light-dark tokens. Các ca source-only kiểm parser, IME, caret, bounds, native validity/reset và SSR; browser/native-validation UX, mobile geometry, AT và packed consumer cần kiểm tra riêng trước kết luận tích hợp.

NumberInput không đặt safe-integer cap cho số hữu hạn. Root primitive dùng khoảng tương tác hữu hạn rộng khi consumer không truyền bound; public `inputRef` đồng bộ min/max của native validator về đúng prop explicit tại ref attach và sau mỗi commit, không tạo payload thứ hai. SSR markup của primitive còn mang bound tương tác dự phòng cho đến hydration; không coi đó là native validation chính xác trước JavaScript. Kiểm tra step alignment qua native validator cần `min` explicit; khi không có min, step base có thể theo value attribute như quy tắc HTML/primitive. Các ca kiểm thử source gồm số lớn, step 0.1/0.3/0.7, đổi bounds và checkValidity từ consumer layout; UX native thực tế vẫn cần browser gate.

Draft display dùng tối đa 17 significant digits để các giá trị hữu hạn JavaScript, kể cả số rất nhỏ/subnormal, có thể roundtrip qua parser mà không bị hiển thị thành 0 do giới hạn fraction digits. Điều này giữ model số JavaScript, không phải decimal/currency exactness. Model `null` không tạo named payload; với controlled clear chưa được parent acknowledge, payload vẫn theo model trước đó. Home/End chỉ bước tới min/max khi consumer khai báo bound tương ứng; nếu bound không được khai báo, phím giữ native caret behavior. Các ca nguồn kiểm cả controlled/default tiny values, prop update với min/step nhỏ, null omission và các phía bound độc lập.


### Select, Combobox và Autocomplete

`Select` giữ key được chọn, còn `Combobox` quản lý key và query riêng biệt. Options có `{key, label, data, disabled?}`; slot `renderOption` nhận nguyên đối tượng `data` của consumer. Key số và chuỗi khác nhau, kể cả `0`, `'0'` và chuỗi rỗng. Native form gửi một giá trị `n:<số>` hoặc `s:<chuỗi>`; `null` không gửi tên field. Option disabled vẫn hiển thị, nhưng không chọn được; navigation Arrow/Home/End bỏ qua chúng. Typeahead và phần còn lại của focus/overlay do primitive quản lý.

Key chưa có trong options vẫn được giữ. `unresolvedLabel(key)` hoặc chuỗi fallback cung cấp nhãn hiển thị; khi options đến, nhãn suy ra được cập nhật mà không đề xuất đổi key. Query đã được người dùng sửa vẫn giữ nguyên khi labels/options refresh. `query` controlled luôn cần `onQueryChange`; value/query không chuyển mode sau mount. Khi consumer xác nhận một key mới, query uncontrolled cập nhật theo nhãn key. `defaultQuery` đọc một lần; native reset khôi phục cả default key và default query, không phát callback thay đổi.

`Autocomplete` giữ chuỗi tự do, không ép thành key của suggestion; chính input visible sở hữu một native payload chuỗi. IME giữ draft đang composition và danh sách theo query đã commit; chỉ kết thúc composition mới đề xuất query/text. Escape đóng popup và giữ selection/query/text hiện tại. Clear của Select/Combobox là hành động riêng, đề xuất `null`; với Combobox, clear cũng đề xuất query rỗng. Controlled mode đợi props xác nhận.

`nameFromField` dùng một Field owner: label liên kết button trigger của Select hoặc input của hai controls còn lại; required, description và error thuộc Field. Required Combobox kiểm tra key được chọn, không coi search text bất kỳ là selection hợp lệ. Form bên ngoài được liên kết bằng `form`; listener reset theo input đã commit và dọn khi form/owner đổi. Disabled không gửi payload; readOnly cho phép xem danh sách nhưng không đổi dữ liệu. Loading/status/no-results không thay Field error và không tự tải dữ liệu.

Portal dùng scope của owner và quy tắc nested modal đã mô tả ở phần overlay. Dropdown dùng semantic tokens, target option/clear tối thiểu 44 px và không thêm font/icon/dependency. Các browser cases kiểm tra native validation/focus, IME và viewport light/dark đã được soạn; kết quả source SSR/types/unit không thay thế việc chạy các cases đó hoặc kiểm tra screen reader thực tế.

Disabled option dùng button nằm trong fieldset disabled đã reset margin/padding/border để primitive nhận trạng thái native không focusable; wrapper không thêm tên hay payload form. Option vẫn giữ role option và nhãn label riêng, kể cả slot data chỉ có nội dung trang trí. Select đang giữ key disabled khi mở sẽ đưa focus tới option enabled đầu tiên mà không đổi model; danh sách toàn disabled vẫn đóng được bằng Escape. Combobox giữ focus input và active descendant chỉ trỏ option enabled. Empty status của Combobox/Autocomplete đọc kết quả đã lọc từ public primitive context, gồm collator theo locale và trim query; loading được ưu tiên. Các kiểm tra markup/source không thay thế xác minh accessibility tree và keyboard trong browser thực tế.
