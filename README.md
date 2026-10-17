# sdcorejs-nova

SD Nova là Core UI React độc lập cho trang end user, package đề xuất `@sdcorejs/nova`, tham khảo capability của `@sdcorejs/angular` và dùng shadcn/Base UI làm nền.

Trạng thái: P0 (12 dossier) đã merge tại `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`. P1 (26 dossier) đã lưu commit local `83af685a76dd166f239567372efd3582ed9bbb5c`; AC-095–097 còn chờ nghiệm thu manual. P2 (14 dossier) có source MVP local, API/package/showcase VI/EN và kiểm chứng tự động; chưa commit. P2 workbook adapter thực (một phần AC-043) và PDF/screen reader AC-048–049 còn chờ. Package vẫn **chưa publish** (`private: true`, phiên bản 0.0.0, license [MIT](LICENSE)); P3 ngoài phạm vi triển khai này.

- [Bắt đầu đọc bộ spec Nova r1](docs/nova/README.md)
- [Mục lục tài liệu](docs/README.md)
- [Hướng dẫn tích hợp P0](docs/nova/p0-integration.vi.md)
- [Kiến trúc P0](docs/nova/p0-architecture.vi.md)
- [API và tích hợp P1](docs/nova/p1-contract.vi.md)
- [Phạm vi và kiểm chứng P1](docs/nova/p1-plan.vi.md)
- [API, tích hợp và giới hạn kiểm chứng P2](docs/nova/p2-implementation.vi.md)

Tài liệu có 59 spec, architecture/conventions candidate, inventory provenance và review độc lập. API P0/P1/P2 có source local và declaration exports; P1/P2 chưa merge hoặc phát hành. P2 bổ sung 22 subpath và 16 stylesheet component; adapter storage chỉ nằm tại `@sdcorejs/nova/adapters/storage`. Revision online không được xác minh lại trong đợt local này.

Showcase consumer Vite/Pages đã có menu gọn với selected/hover/focus riêng; CI và deployment/public revision cần xác nhận bằng run thực tế. Xem [hướng dẫn showcase](docs/nova/showcase-pages.vi.md). npm release tiếp tục hoãn đến sau P1/P2 và review, owner tự đánh version tag.

## Dùng P1 trong consumer

Cài tarball local do `npm run smoke:pack` tạo để kiểm chứng trước phát hành. Import CSS một lần trong app; core root và subpaths đều có declarations.

```tsx
import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
import {NovaProvider, DatePicker, TimeInput, NumberInput} from '@sdcorejs/nova';

export function Example() {
  return <NovaProvider locale="vi"><form>
    <DatePicker label="Ngày hẹn" name="date" referenceDate="2026-10-14" />
    <TimeInput label="Giờ hẹn" name="time" defaultValue="00:00" required />
    <NumberInput label="Số lượng" name="quantity" defaultValue={0} />
    <button type="submit">Gửi</button>
  </form></NovaProvider>;
}
```

Core không yêu cầu React Hook Form hoặc Temporal. Khi dùng adapter, consumer cài peer tương ứng: `react-hook-form@7.89.0` và/hoặc `@js-temporal/polyfill@0.5.1`, rồi import từ `@sdcorejs/nova/adapters/react-hook-form` hoặc `@sdcorejs/nova/adapters/temporal`. Không có adapter export từ root.

Kiểm tra package: `npm run typecheck:fixtures`, `npm run check:package`, `npm run check:adapters`, `npm run smoke:pack`, rồi `npm run test:e2e`. Smoke chạy core consumer không cài optional peers, TS 6/5.7 declarations, Vite CSR, Next SSR và bundle isolation. Các lệnh không thay thế nghiệm thu screen reader, IME và thiết bị thật.
