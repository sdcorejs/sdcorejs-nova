# Theme Nova v2 — foundations và component

Tài liệu bàn giao cho đợt áp dụng design system v2 (theme Nova) vào source. Nguồn yêu cầu: gói "Nova Review vòng 1" (`handoff/PROMPT-ds-v2.md`, `Nova Foundations.dc.html`, `tokens/*.css`) và quyết định owner ngày 2026-10-25: giữ bản sắc trung tính đen–trắng, màu chính `#17171a`, mật độ gọn (control mặc định 32), bo góc 6–8, font hệ thống, có dark mode, tham khảo shadcn/ui.

**Phạm vi đợt này: giữ nguyên public API.** Tên gói vẫn `@sdcorejs/nova`, token vẫn `--nova-*`, chế độ tối vẫn `data-nova-theme="dark"`. Giá trị v2 được áp vào các token hiện có và vào token mới (thêm, không đổi tên). Đổi tên gói và tiền tố nằm ở mục [Câu hỏi cho owner](#câu-hỏi-cho-owner).

Nhãn nội dung: mọi số đo trong tài liệu này là **tham chiếu từ source** sau đợt áp dụng (đo bằng DOM trong test browser/showcase). Các giá trị lấy từ gói thiết kế mà chưa có trong source được ghi là **mockup thiết kế mới**.

## 1. Lỗi foundations đã sửa

| # | Vấn đề | Bằng chứng | Cách sửa |
|---|---|---|---|
| F1 | Viền control tối `#6a6a73` (gray-600) chỉ đạt **2.83–2.91:1** trên nền tone tối 12% (`#24232d`, `#1d252e`, `#1b2823`, `#2c2518`, `#2c2122`). Vi phạm INV-013 của repo (viền control ≥ 3:1 trên mọi bề mặt control có thể nằm lên). Bảng v2 chỉ kiểm `background` và `surface` nên không thấy lỗi. | `src/tokens/tokens.test.ts` › *control-border ≥ 3:1 on every control surface* | Thêm bước ramp **gray-550 `#71717a`** chỉ dùng cho `control-border` tối: 3.13–3.96:1 trên mọi bề mặt. `control-border-hover` tối là gray-500 `#8a8a93`. |
| F2 | Số tương phản trong `Nova Foundations.dc.html` được điền tay và **làm tròn lên** (17.89, 7.74, 3.58, 6.98, 5.40, 6.05, 8.22, 8.03). Repo dùng quy tắc không làm tròn lên (4.49 không đạt 4.5). Không cặp nào đổi kết quả đạt/không đạt, nhưng số hiển thị lệch 0.01. | `node scripts/report-contrast.mjs` | Bảng tương phản giờ **sinh từ token** bằng `npm run report:contrast` (cắt 2 chữ số). Số đúng: 17.88, 7.73, 3.57, 6.97, 5.39, 6.04, 8.21, 8.02. |
| F3 | Bảng kiểm tương phản v2 thiếu các cặp trạng thái: chữ trên `muted`/`active`/`popover`, chữ trên `primary-hover`/`primary-active`, `destructive-foreground` trên `destructive-hover`, viền control trên nền tone. | `report-contrast.mjs`, `tokens.test.ts` › *v2 state fills keep text ≥ 4.5:1* | Thêm 28 cặp vào báo cáo và test; tất cả đạt ở cả hai chế độ (bảng ở mục 3). |
| F4 | CSS v1 thiếu token trạng thái nên tự chế: nền pressed dùng `--nova-color-border`, nút chính pressed dùng `text-muted`, nút danger hover/pressed dùng `color-mix(… 86%/72% …)`, viền alert dùng `color-mix(tone 30%, transparent)`, icon vô hiệu dùng `control-border`. | grep trên `src/styles/components/*.css` (20 chỗ pressed, 12 chỗ hover viền, 7 viền tone, 2 danger) | Thêm token `surface-active`, `action-active`, `danger-hover`, `control-border-hover`, `border-strong`, `popover`, `*-border` và thay toàn bộ. Icon vô hiệu dùng `disabled-text` (≥ 4.5:1), không dùng opacity. |
| F5 | Bóng và nền mờ hộp thoại là token không theo theme: tối vẫn bóng 12% và backdrop 35%. | `tokens.ts` v1 (`scaleTokens`) | Nhóm token hiệu ứng theo theme (`effectTokens`): `shadow-xs/sm/md/lg`, `shadow-overlay` (= md), `color-backdrop` 40% sáng / 60% tối. |
| F6 | Kiểm alias (việc 1.3 của prompt). Repo không có lớp `nova-compat.css`: component đọc thẳng `--nova-*`. | `scripts/build-css.mjs` dừng build khi gặp `var(--nova-x)` không có trong `tokens.ts`; `check:css` kiểm fallback | 59 file CSS qua `check:css`; không còn biến thiếu. |
| F7 | Kiểm dark mode thực tế (việc 1.4). | Showcase `?theme=dark#/profile`, đo `getComputedStyle` | Trong vùng `data-nova-theme="dark"`: viền input `#71717a`, nền card `#0f0f11`, header bảng `#17171a`, badge success nền `#1b2823` viền `#305241`, shadow-xs `rgb(0 0 0 / 0.4)`. Test `p1-multi-select` kiểm popup tối `rgb(23, 23, 26)`. |

## 2. Ánh xạ vai trò v2 → token `--nova-*`

Ramp trung tính (`grayRamp` trong `tokens.ts`): 0 `#ffffff` · 50 `#fafafb` · 100 `#f4f4f5` · 150 `#ececee` · 200 `#e0e0e4` · 300 `#c9c9cf` · 400 `#a1a1aa` · 500 `#8a8a93` · **550 `#71717a`** · 600 `#6a6a73` · 700 `#52525a` · 800 `#3f3f46` · 850 `#2a2a2f` · 900 `#1e1e22` · 950 `#17171a` · 975 `#0f0f11`. Test *every neutral token points at a step of the gray ramp* giữ mọi màu trung tính trong ramp.

| Vai trò v2 (`--sd-*`) | Token repo | Sáng | Tối | Ghi chú |
|---|---|---|---|---|
| background | `--nova-color-background` | 0 | 975 | |
| foreground | `--nova-color-text` | 950 | 100 | v1 `#171717` |
| surface | `--nova-color-surface` | 50 | 950 | header bảng, read-only |
| muted | `--nova-color-surface-hover` | 100 | 900 | hover, nút ghost, chip, track |
| active | `--nova-color-surface-active` *(mới)* | 150 | 850 | pressed, expanded |
| muted-foreground | `--nova-color-text-muted` | 700 | 400 | 7.73 / 7.47 |
| border | `--nova-color-border` | 200 | 850 | trang trí, không làm viền control |
| border-strong | `--nova-color-border-strong` *(mới)* | 300 | 800 | viền checkbox/radio vô hiệu |
| input | `--nova-color-control-border` | 500 | **550** | xem F1 |
| input-hover | `--nova-color-control-border-hover` *(mới)* | 600 | 500 | |
| ring | `--nova-color-focus-ring` | 950 | 100 | |
| popover | `--nova-color-popover` *(mới)* | 0 | 950 | menu, popup, dialog, toast |
| primary / hover / active | `--nova-color-action` / `-action-hover` / `-action-active` *(mới)* | 950 / 800 / 700 | 100 / 200 / 300 | |
| primary-foreground | `--nova-color-on-action` | 0 | 950 | |
| destructive / hover / foreground | `--nova-color-danger` / `-danger-hover` *(mới)* / `-on-danger` | `#b42318` / `#9a1c13` / `#ffffff` | `#f97066` / `#fb8a81` / 950 | |
| disabled / disabled-foreground | `--nova-color-disabled-surface` / `-disabled-text` | 100 / 600 | 900 / 500 | |
| {tone}-foreground / -surface / -border | `--nova-color-{tone}-text` / `-surface` / `-border` *(mới)* | giữ v1 | 12% sắc độ trên 975 | tip, info, success, warning, error |
| overlay | `--nova-color-backdrop` | 40% | 60% | theo theme |
| shadow-xs/sm/md/lg | `--nova-shadow-xs/sm/md/lg` *(mới)*, `--nova-shadow-overlay` = md | | | theo theme |

Thang đo (`scaleTokens`), giá trị đổi **đậm**:

| Nhóm | Token |
|---|---|
| Chữ | `font-size-xs` 12/16 *(mới)* · `label` 13/18 · `body` 14/20 · `md` 16/24 *(mới)* · `input-mobile` 16/24 · `lg` 18/26 *(mới)* · `title` 20/28 · `2xl` 24/32 *(mới)* · weight `regular` 400 *(mới)* / `medium` 500 / `strong` 600 |
| Khoảng cách | giữ `space-1…7` = 4, 8, 12, 16, 24, 32, 48; thêm `space-0-5` 2, `space-1-5` 6, `space-2-5` 10 |
| Control | `control-xs` 24 *(mới)* · `sm` 28 · `md` **32** (v1 36) · `lg` **40** (v1 44) · `hit-target` 44 |
| Icon | `icon-xs` 14 *(mới)* · `icon-sm` 16 · `icon-lg` 20 |
| Bảng | `row-header` 36 · `row-md` 40 · `row-sm` 32 · `col-select` 36 · `col-actions` 40 *(mới)* |
| Bo góc | `radius-xs` 4 *(mới)* · `control` 6 · `popup` 8 · `card` **8** (v1 10) · `overlay` **10** (v1 12) · `full` 999 *(mới)* |
| Khác | `bar-height` 52, `popup-min-width` 180, `dialog-sm/md/lg` 400/560/800, `duration-fast` 100, `duration` 150, `duration-slow` 200, `ease-standard`, `ease-out` *(mới)* |

## 3. Tương phản (sinh bằng `npm run report:contrast`)

| Cặp | Vai trò | Ngưỡng | Sáng | Tối |
|---|---|---|---|---|
| `text` / `background` | Chữ chính | 4.5:1 | 17.88 | 17.42 |
| `text` / `surface` | Chữ trên surface | 4.5:1 | 17.14 | 16.27 |
| `text` / `surface-hover` | Chữ trên hover/muted | 4.5:1 | 16.27 | 15.11 |
| `text` / `popover` | Chữ trong popup | 4.5:1 | 17.88 | 16.27 |
| `text-muted` / `background` | Chữ phụ | 4.5:1 | 7.73 | 7.47 |
| `text-muted` / `surface` | Chữ phụ trên surface | 4.5:1 | 7.41 | 6.97 |
| `text-muted` / `surface-hover` | Chữ phụ trên muted | 4.5:1 | 7.04 | 6.48 |
| `control-border` / `background` | Viền control | 3:1 | 3.42 | 3.96 |
| `control-border` / `surface` | Viền control trên surface | 3:1 | 3.28 | 3.70 |
| `control-border` / `surface-hover` | Viền control trên muted | 3:1 | 3.11 | 3.43 |
| `control-border-hover` / `background` | Viền control khi hover | 3:1 | 5.35 | 5.59 |
| `focus-ring` / `background` | Vòng focus | 3:1 | 17.88 | 17.42 |
| `disabled-text` / `disabled-surface` | Chữ vô hiệu | 4.5:1 | 4.87 | 4.85 |
| `on-action` / `action` · `-hover` · `-active` | Nút chính | 4.5:1 | 17.88 · 10.44 · 7.73 | 16.27 · 13.58 · 10.85 |
| `on-danger` / `danger` · `-hover` | Nút xóa | 4.5:1 | 6.57 · 8.23 | 6.42 · 7.71 |
| `{tone}-text` / `{tone}-surface` | tip · info · success · warning · error | 4.5:1 | 6.02 · 5.57 · 5.39 · 5.20 · 6.04 | 8.21 · 8.75 · 9.44 · 9.80 · 8.02 |
| `control-border` / `{tone}-surface` | Viền control trên nền tone | 3:1 | 3.11 · 3.18 · 3.24 · 3.27 · 3.14 | 3.21 · 3.20 · 3.16 · 3.13 · 3.22 |

Bảng đầy đủ kèm mã màu: chạy `npm run report:contrast` (thoát mã 1 nếu có cặp dưới ngưỡng).

## 4. Component

Chung cho mọi control: cao 32 (desktop), 44 khi `(max-width: 640px), (pointer: coarse)`, chữ input 16/24 ở chế độ đó. Viền `control-border` + `shadow-xs`; hover viền `control-border-hover`; focus-visible vòng 2 px offset 2 (trong danh sách: inset 2); invalid viền `error-text`; read-only nền `surface` viền `border` không bóng; vô hiệu nền `disabled-surface`, chữ/icon `disabled-text`, không bóng, không opacity.

| Nhóm | Thông số v2 (tham chiếu từ source) |
|---|---|
| Button | primary / secondary (= kiểu viền: nền background, viền control-border, shadow-xs) / ghost / danger. sm 28 (pad 10) · md 32 (pad 12) · lg 40 (pad 16). Icon 16 mọi size, khoảng icon–chữ 6. Hover: primary → action-hover, secondary/ghost → surface-hover, danger → danger-hover. Pressed/expanded: action-active, surface-active. Loading giữ chiều rộng. |
| IconButton | vuông 28/32/40, icon 16; coarse: phần tử 44, bề mặt 32 (viền trong suốt 6). |
| ButtonGroup, CopyButton | gap 8; icon copy cách chữ 6. |
| ActionMenu | trigger kiểu secondary 32 (pad 12/10); menu padding 4, bo 8, `shadow-md`, nền popover, min 180; hàng 32 (pad 6/8, bo 4), coarse 44. Trigger icon 28, trong ô bảng 24. |
| Field | nhãn 13/18 **500**, nhãn ↔ mô tả ↔ control ↔ lỗi 6; FormErrors bo 8 viền error-border. |
| Input / Textarea / InputGroup | 32 / ≥ 78 (3 dòng) / 32 với vạch chia 20; input lồng trong khung không có bóng riêng. |
| Select / Combobox | trigger pad 12/10, chevron 16 cách mép 10, clear 24 (bo 4) cách chevron 4; popup như menu, option 32 pad 6/8 (chữ thẳng với trigger). |
| MultiSelect / ChipInput | khung 32, chip 24 (bo 4, nền muted), padding khung 3 nên một dòng đúng 32; nút xóa chip 22 với icon 14; chip xuống dòng khi dài (không ép về 32). Coarse: chip 32, nút xóa 44. |
| NumberInput | stepper vuông 32 (44 coarse), pressed surface-active, vô hiệu disabled-text. |
| Checkbox / Radio / Switch | hộp 16 bo 4 + shadow-xs, vùng bấm 20 (44 coarse); vô hiệu viền border-strong; switch track muted, checked hover action-hover. |
| SegmentedControl | track 32 (đệm 2), mục 26, bo 4; light = track muted, mục chọn nền background + viền control + shadow-xs. |
| DataTable | header **36** (13/18 600 muted, nền surface), hàng **40**, dày **32** (`className="nova-data-table--dense"`), cột chọn **36**, cột mở rộng 36, cột thao tác **40**; nút sort 24; nút trong ô xs 24 (pad 8, chữ 13/18, icon 14) chỉ với pointer fine; hàng chọn nền muted; lỗi bo 8 viền error-border. Trạng thái: skeleton lần đầu, "Đang cập nhật…", lỗi + Thử lại, trống, chọn, sort nhiều cột (không đổi hành vi). |
| TablePagination | footer pad 10/16 (48 + viền), nút 28 icon 16, Select 28; coarse nút 44 bề mặt 32. |
| Dialog / Sheet | header & footer **52** (pad 12/16, footer 10/16 quanh nút 32), tiêu đề 18/26 600, nút đóng 28 (44 coarse), body pad 4/16/16, rộng sm/md/lg 400/560/800 (mặc định giữ 512 theo Q4), bo **10**, `shadow-lg`, nền popover, backdrop 40/60%. Confirm rộng 400, nút 32. |
| Popover / Tooltip | popover pad 16 bo 8 `shadow-md` nền popover; tooltip pad 6/8, 13/18, nghịch màu. |
| Toast | bo 8, `shadow-md`, nền popover; nút hành động 28 kiểu secondary; đóng 28. |
| Badge | cao **20**, chữ **12/16 500**, icon 14, bo full; tone có viền tone-border (nhìn rõ trên nền tối 12%). |
| Avatar | 24 / 32 / **40** (v1 lg 44: avatar không tương tác nên không cần 44), nền muted, chữ 500. |
| Card / Section | bo **8**, không bóng; tiêu đề h3/h4 16/24. |
| Alert | bo 8, viền tone-border, nền tone-surface, chữ body màu text, icon màu tone. |
| Spinner / Progress / Skeleton / Empty / DataState | track progress bo full; skeleton text 12 bo 4, tròn 40; ô icon Empty/DataState 40 bo 8. |
| Tabs / Stepper / Accordion / AnchorNavigation / Breadcrumb | tab 32, gap 6; bước 32, marker 24, check 14; accordion hàng 32 (pad 6/12) chữ 500, panel thẳng hàng tiêu đề; anchor 32; nút thu gọn breadcrumb 24 bo 4. |
| AppShell | header **52**, sidebar **240**, mục điều hướng 32 (44 coarse). |
| Khác (P1/P2) | CalendarChips, DatePicker, ColorInput, InlineText khớp lưới 32 (chip 24, nút lịch 24, khung 3 px). Các component còn lại nhận token mới qua biến. |

Ghi chú icon: icon nội bộ 16×16 nét 1.5 (`src/lib/icons.tsx`). Không dùng ký tự làm icon. Icon ngoài bộ: Lucide size 16, strokeWidth 2.25 (= 1.5 trên lưới 16) và ghi chú lại; đợt này không thêm icon ngoài bộ.

## 5. Màn hình áp dụng — "Hồ sơ nhân sự"

Showcase có trang mới `#/profile` (`showcase/src/pages/profile-page.tsx`): biểu mẫu "Thêm nhân sự" (Input, Select phòng ban dài, DatePicker dd/mm/yyyy, NumberInput lương vi-VN, SegmentedControl, MultiSelect, Textarea, Switch, Checkbox, read-only, lỗi email khi lưu) và "Danh sách nhân sự" 248 bản ghi (sort nhiều cột, chọn hàng, menu hàng, phân trang 10/20/50 có trang đầu/cuối). Hai SegmentedControl trên bảng chuyển **mật độ 40/32** và **mô phỏng dữ liệu** (tải lần đầu, đang cập nhật, lỗi + thử lại, trống).

Đã đo (Chromium, `test/showcase/showcase.spec.ts` › *v2 profile screen*): ở 1280 sáng và tối, input/select/nút 32, header bảng 36, nút phân trang 28, nhãn 500, hàng dày 32; ở 375 không tràn ngang, input 44 chữ 16, nút/checkbox/phân trang 44, bảng chuyển dạng thẻ. Axe WCAG 2.2 AA không có vi phạm ở cả hai theme.

## 6. Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run typecheck:showcase` | sạch |
| `npm run check:css` | 59 file OK |
| `npx vitest run --project unit` | xanh, trừ `test/package/bundle.test.ts` (bundle-isolation) đã lỗi từ trước đợt này trên máy kiểm |
| `npm run report:contrast` | mọi cặp đạt |
| `npx playwright test --project=chromium` / `--project=webkit` (browser harness) | 254/254 mỗi engine |
| `npx playwright test --config test/showcase/playwright.config.ts --project=chromium` / `--project=webkit` | 30/30 mỗi engine |

Chưa kiểm: Firefox (trên máy kiểm Playwright không khởi động được Firefox: `browserType.launch: spawn UNKNOWN`, lỗi môi trường), screen reader và thiết bị thật. Prototype và test tự động không thay nghiệm thu đó. Một lần chạy Chromium đầu tiên có `display.spec.ts › display scenario has no axe violations` lỗi rồi đạt ở mọi lần chạy sau (kể cả chạy riêng); cần theo dõi nếu lặp lại trên CI.

## 7. Đề xuất đổi API (chưa làm)

| Đề xuất | Hiện tại | Lý do |
|---|---|---|
| `Button size="xs"` (24) | Nút trong ô bảng tự thu về 24 bằng CSS ngữ cảnh | Cho phép dùng xs ngoài bảng (chip action, toolbar dày) |
| Tách `variant="outline"` khỏi `secondary` (secondary = nền muted kiểu shadcn) | `secondary` là kiểu viền + shadow-xs | Khớp bộ biến thể shadcn; nhưng đổi nghĩa `secondary` là breaking, cần owner chọn |
| `DataTable density?: 'regular' \| 'dense'` | Lớp CSS `nova-data-table--dense` qua `className` | Kiểu dữ liệu rõ ràng, không phụ thuộc tên lớp |
| `Column.align?: 'start' \| 'end'` | Consumer tự căn số (showcase dùng class riêng) | Cột số căn phải, tabular-nums thống nhất |

## Câu hỏi cho owner

| # | Câu hỏi | Phương án đề xuất |
|---|---|---|
| Q1 | Đổi tên gói `@sdcorejs/nova` → `@sdcorejs/react` và tiền tố `--nova-` → `--sd-`? | Làm ở bản 0.2.0 có mục **Breaking**: xuất `tokens.css` với `--sd-*` là tên chính và `--nova-*` alias trong một bản minor, gỡ alias ở bản sau. Tên gói đổi cùng lúc với subpath giữ nguyên. |
| Q2 | `data-sd-mode` thay `data-nova-theme`? | Đổi cùng Q1; `NovaProvider theme` giữ prop, chỉ đổi thuộc tính DOM; đọc cả hai thuộc tính trong một bản chuyển tiếp. |
| Q3 | Control md 36 → 32 (đổi contract C01/F02)? | **Đã áp dụng** trong đợt này theo quyết định mật độ gọn; vùng bấm coarse vẫn 44. Xin owner xác nhận để cập nhật spec C01/F02. |
| Q4 | Nhãn trường 600 → 500? | **Đã áp dụng**; tiêu đề và header bảng giữ 600. |
| Q5 | Nền tối của các tone đổi sang 12% sắc độ? | **Đã áp dụng**, kèm viền control tối gray-550 (F1) để giữ INV-013. |
| Q6 | Thêm bước ramp gray-550 `#71717a` (ngoài ramp v2)? | Giữ: đây là cách nhỏ nhất để đạt 3:1 trên nền tone tối. Phương án khác: làm tối nền tone (giảm sắc độ) hoặc dùng gray-500 (viền tối đậm hơn rõ). |
| Q7 | `secondary` giữ kiểu viền hay chuyển sang nền muted? | Giữ kiểu viền (không breaking); thêm `outline` nếu owner muốn bộ biến thể shadcn đầy đủ (mục 7). |
| Q8 | Dialog mặc định 512 hay 560 (md)? | Giữ 512 theo Q4 của 0.1.0; cân nhắc đổi mặc định thành `md` ở bản có Breaking. |
| Q9 | Avatar lg 44 → 40? | **Đã áp dụng** (avatar không tương tác). |
