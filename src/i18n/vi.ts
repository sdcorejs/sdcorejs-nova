import type { NovaStrings } from './strings.js';

export const vi = {
  common: {
    close: 'Đóng',
    avatarUnknown: 'Người dùng',
  },
  forms: {
    required: 'Bắt buộc',
    configurationError: 'Lỗi cấu hình: thành phần này thiếu tên truy cập hợp lệ.',
    radioEmpty: 'Không có lựa chọn nào.',
    errorsTitle: 'Vui lòng sửa các lỗi sau',
  },
  feedback: {
    loading: 'Đang tải…',
    refreshing: 'Đang cập nhật…',
    empty: 'Không có dữ liệu',
    errorDefault: 'Đã xảy ra lỗi.',
    retry: 'Thử lại',
    dismiss: 'Đóng thông báo',
  },
  navigation: {
    breadcrumb: 'Đường dẫn',
    showHidden: 'Hiện các mục bị ẩn',
    avatarOverflow: { one: 'và {count} người khác', other: 'và {count} người khác' },
  },
} satisfies NovaStrings;
