# Showcase Nova trên GitHub Pages

Showcase là ứng dụng consumer độc lập, chỉ dùng exports công khai của `@sdcorejs/nova` (P0–P2). Khung trang dùng `AppShell`, `Sidebar`, `Navigation` và `Breadcrumb` của Nova cùng hash router riêng (`#/forms` … `#/utilities`, route lạ hiện trang không tìm thấy). Mười trang là mười tình huống nhân sự thật bằng tiếng Việt và tiếng Anh (helper `t(vi, en)`): hồ sơ và đăng ký đào tạo, thao tác trên hồ sơ, tiếp nhận nhân sự mới, quản lý hợp đồng, lịch phỏng vấn và nghỉ phép, trung tâm thông báo, danh sách 248 nhân sự, giấy tờ nhân sự, tác vụ chạy nền và tiện ích hằng ngày. Mọi thao tác chỉ đổi state trong trang đang mở, không lưu tài khoản hoặc gửi backend. Nút ngôn ngữ trên header và radio "Ngôn ngữ giao diện" ở trang Biểu mẫu cùng đổi ngôn ngữ của showcase.

Layout theo thiết kế vòng 2: sidebar 232 px sticky cao hết màn hình, header sticky 56 px (breadcrumb gốc "Nova", nút ngôn ngữ và giao diện sáng/tối), vùng chính padding 24 px (16 px khi ≤ 640 px), nội dung rộng tối đa 1040 px, riêng trang Dữ liệu rộng hết khung. Mỗi trang có tiêu đề h1 24/32 và một dòng giới thiệu; card gồm header (tiêu đề 16/24, meta, thao tác) / body padding 16 / footer thao tác; nút cỡ md, mỗi vùng một nút chính, thao tác phá hủy dùng `danger` và Confirm. Menu cao 36 px trên desktop và 44 px khi `(max-width: 640px), (pointer: coarse)`, padding 10 px; trang hiện tại nền `surface-hover` và chữ đậm 500, không dot hoặc border nhấn; hover và focus-visible có trạng thái riêng. Route không biết không đánh dấu menu selected. Dưới 64rem (1024 px, breakpoint của `Sidebar` theo quyết định Q9 vòng 2) sidebar thành drawer mở bằng nút menu biểu tượng 44 px. Trang Dữ liệu dùng `DEFAULT_PAGE_SIZE`, Select số hàng mặc định và nút Trang đầu/cuối; thao tác "Cho nghỉ việc…" có `tone: 'danger'`. Dialog tạo hợp đồng dùng `size="md"` và `footer`; trang Lịch dùng DateTimePicker `precision="minute"`. Kiểm thử pass không đồng nghĩa visual acceptance. Không có Tailwind, font/icon dependency hoặc asset ngoài; consumer dùng CSS namespace `.showcase`, icon SVG nội tuyến của showcase, system font và token hiện có.

Giá trị thô (JSON, enum, khóa, chuỗi kỹ thuật) chỉ nằm trong khối `<details>` "Chi tiết kỹ thuật" / "Technical details" của từng card; các `<output aria-label=…>` và `data-testid` mà test dùng vẫn giữ nguyên. Trang Dữ liệu sinh 248 nhân sự bằng bộ sinh có seed (không `Math.random`), cắt trang 10 dòng và sắp xếp nhiều cột trong component trang như một API thật, khóa chọn hàng với người đã nghỉ việc, có thao tác hàng, chi tiết mở rộng và giao diện hàng cho mobile. Trường hợp kỹ thuật khóa số `0` và khóa chuỗi `"0"` được giữ trong bảng nhỏ "Hồ sơ dự án" bên trong khối chi tiết kỹ thuật.

## Chạy và kiểm tra cục bộ

Từ Git root Nova, với Node 22.22.2 và npm theo lockfile:

```sh
npm ci
npm run build
npm run typecheck:showcase
npm run build:showcase
npm run check:showcase
npm run test:showcase
npm run preview:showcase
```

Preview: `http://127.0.0.1:5203/sdcorejs-nova/#/forms`. Test dùng cùng port 5203 và tự quản lý server, nên dừng preview bằng Ctrl+C trước khi chạy test. Test mở khối "Technical details" khi cần tương tác với nội dung bên trong; output ẩn vẫn được đọc bằng `textContent`. Playwright cần ba engine đã cài; dùng `npx --no-install playwright install --with-deps chromium firefox webkit` khi môi trường CI chưa có trình duyệt. Không cài dependency runtime mới.

`showcase/dist/` là output bị gitignore. Vite dùng project base `/sdcorejs-nova/`, hash route `#/forms`, không publicDir từ repo và không source map. Hash không biết hiện trang không tìm thấy; skip-link focus/scroll main mà không thay route. Nav chưa có nội dung không giả làm link hoạt động.

`revision.json` ghi Git HEAD thật, `workingTreeDirty` và SHA256 của asset. Preview của source chưa commit có `workingTreeDirty: true`; SHA HEAD đó chỉ là nền của working tree, không đại diện cho source showcase đã commit. Build/check với `--deploy`, và mọi run GitHub Actions, từ chối source/artifact dirty hoặc `GITHUB_SHA` không khớp actual checkout. Không dùng local dirty preview làm bằng chứng public deployment.

## Artifact và quyền deploy

Chỉ `index.html`, JS/CSS trong `assets/`, `revision.json`, `LICENSE`, `THIRD_PARTY_NOTICES.md` và `THIRD_PARTY_BUNDLE_LICENSES.md` được upload. Checker từ chối file ngoài allowlist, source map, asset sai base/đường dẫn, revision mismatch và nội dung nội bộ/transfer. Vite 8 `build.license` tạo inventory và license text của các dependency thực sự bundle; checker đối chiếu tên/version/license/text với packages installed và inventory độc lập thu từ module IDs của các chunk thật khi build, gồm React, ReactDOM, Base UI và dependencies transitively được bundle. Notices của package npm chưa bundle được giữ nguyên và đi cùng bundle notices riêng.

CI hiện có giữ quyền read-only và thêm showcase checks sau P0 gates. Pages workflow chỉ chạy build/deploy trên main; manual dispatch từ branch khác không vượt main guard. Build có `contents: read` và `pages: read` để action configure-pages đọc site hiện có (enablement false); dùng read-only checkout, Node/lockfile, các P0 gates theo thứ tự sạch, rồi showcase checks. Chỉ deploy job có `pages: write` và `id-token: write`, phụ thuộc build và environment `github-pages`. Actions đều ghim full SHA. Không có npm publish, npm auth, tag hoặc `contents: write`.

## Xác nhận public revision

URL mục tiêu: `https://sdcorejs.github.io/sdcorejs-nova/#/forms`. Đây là URL dự kiến; không suy site đã deploy từ việc cấu hình Pages hoặc tài liệu này.

Sau khi merge và workflow thật thành công: đối chiếu actual workflow run SHA và Pages deployment SHA với GET `/sdcorejs-nova/revision.json` có cache-busting. Revision phải exact match, `workingTreeDirty` phải false, asset request không lỗi và nội dung Forms đúng. Mở/refresh route, thử menu mobile, skip-link, Save/Reset local và light/dark. Lưu UTC, run/deployment URL, revision và response status thật; HTTP 200 đơn lẻ chưa đủ.

## Các giới hạn còn mở

Manual screen reader, zoom 200% và nhập Telex/VNI cần kiểm tra riêng; automation không thay thế xác nhận bằng mắt và công nghệ hỗ trợ. Remote clean CI, merge/deployment và public revision cần kết quả thực tế tương ứng.

P1/P2 tiếp theo có spec/architecture/plan/TDD và review độc lập sau milestone P0 theo thứ tự đã chốt. Owner chỉ đánh version tag để release npm sau P1/P2 và review. P3 chưa thuộc phạm vi này.

Parser workflow chỉ là build tooling: dependency chain đã kiểm tra `eslint 9.39.5 → @eslint/eslintrc 3.3.7 → js-yaml 4.3.2`, resolve qua package sở hữu bằng `createRequire`, không dựa vào import root hoisting. Không đổi dependency hoặc lockfile. Inventory kiểm tra riêng được build tạo từ các module đã bundle, gắn actual HEAD và asset SHA256; chỉ notices công khai và artifact allowlist được upload lên site.

WebKit trên Windows theo thiết lập keyboard access của máy với Tab qua link; automation focus skip-link rồi Enter để chứng minh focus/route semantics. Không coi đó là xác nhận manual full keyboard hoặc screen reader.
