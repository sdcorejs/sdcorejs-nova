# Changelog

Ghi chú thay đổi của `@sdcorejs/nova`. Package vẫn `private: true` và chưa publish npm; `version` trong `package.json` giữ `0.0.0` (được `check:showcase` kiểm). Mỗi bản phát hành được chốt bằng git tag `vX.Y.Z` và GitHub release trên commit `main` tương ứng. Bản 0.x là preview: có thể có breaking change, luôn ghi ở mục **Breaking**.

## Chưa phát hành

Chưa có thay đổi.

## 0.1.0 — 2026-10-22

Bản preview đầu tiên: thiết kế vòng 2 (PR #3), các API và hành vi owner đã duyệt Q1–Q20 (PR #5), và sửa lỗi trả focus của Dialog/Sheet (PR #8).

### Breaking

- **DataTable — thứ tự cột (Q8).** Khi bật mở rộng hàng, cột mở rộng đứng ngay sau cột chọn (trước đây là cột cuối). Chi tiết mở là một hàng `<tr>` riêng có một ô `colSpan` toàn chiều rộng ngay dưới hàng, không còn nằm trong ô của cột mở rộng. CSS hoặc test dựa vào vị trí ô (`td:nth-child`, `td:last-child`) cần cập nhật. `aria-controls` và quy tắc trả focus giữ nguyên.
- **AppShell / Sidebar — breakpoint (Q9).** Sidebar desktop hiện từ `64rem` (1024 px) thay vì `48rem` (768 px). Dưới mốc đó sidebar là drawer modal mở từ cạnh đầu, rộng `min(300px, 100vw − 32px)`, kể cả ở màn hình điện thoại. QueryBar và QueryBuilder chuyển mốc thu gọn từ 768 px sang 640 px; Stepper dọc dùng `640px` thay cho `40rem`. Thư viện chỉ còn hai breakpoint 640 px và 1024 px (ngoại lệ: popup lịch của DatePicker vẫn thành bottom sheet ở ≤ 375 px vì 7 ô 44 px không vừa popover).
- **DateTimePicker — precision mặc định (Q10).** Thêm `precision?: 'minute' | 'second'`, mặc định `'minute'`. Ô giờ nhập `HH:mm`, giá trị phát ra tròn phút (giây = 00); adapter vẫn nhận `HH:mm:ss`. Để giữ hành vi cũ, truyền `precision="second"`.

### Thêm mới

- **TablePagination (Q1–Q3).** `pageSizeOptions?: readonly number[]` với Select số hàng mỗi trang; không truyền thì dùng `DEFAULT_PAGE_SIZE_OPTIONS` (20, 50, 100), mảng rỗng thì bỏ Select. `pageSize` hiện tại luôn có trong danh sách. Chọn cỡ khác đề xuất `{pageIndex: 0, pageSize}`. Hằng `DEFAULT_PAGE_SIZE` (20) cho state ban đầu. `showFirstLast?: boolean` (mặc định false) thêm nút Trang đầu/Trang cuối. Nhãn trang thay bằng khoảng hàng "{start}–{end} trên {total}". Khóa i18n optional mới: `tableRange`, `tableRangeUnknown`, `tablePageSizeLabel`, `tableFirst`, `tableLast`; `tablePageOf` và `tablePageSize` vẫn nhận override nhưng không hiển thị nữa. DataTable chuyển `pageSizeOptions` và `showFirstLast` xuống TablePagination, nên mọi DataTable có Select số hàng theo mặc định.
- **Dialog (Q4).** `size?: 'sm' | 'md' | 'lg' | number | \`${number}px\`` (400/560/800 px hoặc px tùy chỉnh; không truyền vẫn 512 px). Giá trị khác bị bỏ qua với diagnostic `NOVA_DIALOG_INVALID_SIZE`. `footer?: ReactNode` cho Dialog, Sheet/Drawer và ResizableDialog: hàng thao tác dưới body cuộn.
- **DataTable (Q5).** `slots.empty?: ReactNode` thay Empty mặc định khi không có hàng.
- **Action (Q6).** `tone?: 'danger'`: chữ và icon màu danger, nền error-surface khi được chọn trong menu. Thao tác phá hủy vẫn cần Confirm.
- **Token (Q11).** `--nova-font-weight-medium` (500), `--nova-icon-sm` (16px), `--nova-icon-lg` (20px), `--nova-radius-popup` (8px), `--nova-shadow-overlay` (`0 8px 24px rgb(0 0 0 / 0.12)`), `--nova-color-backdrop` (`rgb(0 0 0 / 0.35)`); CSS component dùng token thay literal lặp lại.

### Thay đổi hành vi

- **DataTable (Q7).** Trigger ActionMenu của hàng là nút icon ⋯; "Thao tác hàng {row}" thành aria-label, header cột thao tác ẩn trực quan.
- **DataTable (Q19).** Độ ưu tiên sort là `aria-describedby` của nút sort trỏ tới text ẩn; bỏ `aria-description`.
- **ReadOnlyValue (Q20).** Giá trị trống hiển thị `--` (ẩn với trình đọc màn hình); trình đọc màn hình đọc `feedback.unavailable` ("Không có dữ liệu" / "Unavailable").

### Giao diện (thiết kế vòng 2)

- CSS và markup nội bộ của mọi component P0–P2 theo thiết kế vòng 2: control 36 px trên desktop và 44 px khi `(max-width: 640px), (pointer: coarse)`; Button 28/36/44 với nhãn một dòng trên desktop; popup bo góc 8, bóng và dòng 36/44; icon SVG nội bộ thay ký tự glyph. Không đổi public API.
- Showcase viết lại thành 10 trang kịch bản nhân sự với dữ liệu thực tế.

### Sửa lỗi

- **DataTable.** Vùng cuộn của bảng giữ các phần tử ẩn trực quan bên trong, nên bảng rộng hơn vùng cuộn không còn làm cả trang tràn ngang.
- **Dialog / Sheet / Drawer.** Khi đóng, focus không còn bị kéo về nút mở nếu người dùng hoặc app đã chuyển focus ra ngoài trong lúc overlay đang đóng. Focus vẫn được trả về khi nó còn trong overlay, rơi về `body`, vẫn ở nút mở (overlay đóng trước khi focus vào trong), hoặc khi nội dung có focus bị chuyển ra khỏi overlay (Sidebar của AppShell).
