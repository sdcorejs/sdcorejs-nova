# sdcorejs-nova

SD Nova là Core UI React độc lập cho trang end user, package đề xuất `@sdcorejs/nova`, tham khảo capability của `@sdcorejs/angular` và dùng shadcn/Base UI làm nền.

Trạng thái: P0 (12 dossier) đã merge tại `c7e4bbbf5a948208618bd4b54e492bd3a2f6d662`. P1 (26 dossier) có triển khai local, public exports và showcase VI/EN; đang hoàn tất kiểm chứng và review. Package vẫn **chưa publish** (`private: true`, phiên bản 0.0.0, license [MIT](LICENSE)). P2/P3 tiếp tục là đề xuất.

- [Bắt đầu đọc bộ spec Nova r1](docs/nova/README.md)
- [Mục lục tài liệu](docs/README.md)
- [Hướng dẫn tích hợp P0](docs/nova/p0-integration.vi.md)
- [Kiến trúc P0](docs/nova/p0-architecture.vi.md)
- [API và tích hợp P1](docs/nova/p1-contract.vi.md)
- [Phạm vi và kiểm chứng P1](docs/nova/p1-plan.vi.md)

Tài liệu có 59 spec, architecture/conventions candidate, inventory provenance và review độc lập. API P0/P1 có source local và declaration exports; P1 chưa phải bản đã merge hoặc phát hành. P2/P3 chưa được triển khai.

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
