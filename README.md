# sdcorejs-nova

SD Nova là Core UI React độc lập cho trang end user, package đề xuất `@sdcorejs/nova`, tham khảo capability của `@sdcorejs/angular` và dùng shadcn/Base UI làm nền.

Trạng thái: P0 (12 dossier) đã được triển khai và kiểm cục bộ trên nhánh `feat/nova-p0`, nhưng **P0 này chưa được publish** (`private: true`, phiên bản 0.0.0, license [MIT](LICENSE)). Các dossier P1, P2, P3 vẫn là đề xuất.

- [Bắt đầu đọc bộ spec Nova r1](docs/nova/README.md)
- [Mục lục tài liệu](docs/README.md)
- [Hướng dẫn tích hợp P0](docs/nova/p0-integration.vi.md)
- [Kiến trúc P0](docs/nova/p0-architecture.vi.md)

Tài liệu có 59 spec, architecture/conventions candidate, inventory provenance và review độc lập. API của P0 đã được triển khai; API của P1, P2, P3 vẫn là proposed, cần hoàn thiện contract trước khi triển khai.

Showcase consumer Vite/Pages đã có menu gọn với selected/hover/focus riêng; CI và deployment/public revision cần xác nhận bằng run thực tế. Xem [hướng dẫn showcase](docs/nova/showcase-pages.vi.md). npm release tiếp tục hoãn đến sau P1/P2 và review, owner tự đánh version tag.
