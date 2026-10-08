# Showcase Nova trên GitHub Pages

Showcase là ứng dụng consumer độc lập dùng các exports P0 công khai. Sidebar, hash router và drawer native trong ứng dụng này chưa phải `AppShell`/`Drawer` của Nova P1. Trang đầu tiên là Biểu mẫu với hồ sơ và tùy chọn giả lập; Save chỉ giữ state trong trang đang mở, không lưu tài khoản hoặc gửi backend.

Layout consumer dùng sidebar và nội dung chính, với menu mobile dạng dialog. Menu đã được làm gọn theo mô tả: desktop cao 36 px, padding/gap 8 px; mobile giữ vùng bấm tối thiểu 44 px. Trang hiện tại có nền xám nhẹ từ token surface hiện có, không dot hoặc border nhấn; hover và focus-visible có trạng thái riêng. Route không biết không đánh dấu menu selected. Kiểm thử pass không đồng nghĩa visual acceptance. Không có Tailwind, font/icon dependency hoặc asset ngoài; consumer dùng CSS namespace `.showcase`, system font và token hiện có. Host flex của Breadcrumb được cấp chiều rộng để xử lý inline-size containment.

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

Preview: `http://127.0.0.1:5203/sdcorejs-nova/#/forms`. Test dùng cùng port 5203 và tự quản lý server, nên dừng preview bằng Ctrl+C trước khi chạy test. Playwright cần ba engine đã cài; dùng `npx --no-install playwright install --with-deps chromium firefox webkit` khi môi trường CI chưa có trình duyệt. Không cài dependency runtime mới.

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
