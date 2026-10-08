import { Alert } from '../../../src/components/alert/index.js';
import { Button } from '../../../src/components/button/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

export default function AlertScenario() {
  return (
    <NovaProvider>
      <div style={{ display: 'grid', gap: 12 }}>
        <Alert data-testid="title-only" tone="warning" title="Chưa lưu thay đổi" onDismiss={() => {}} />
        <Alert data-testid="body-only" tone="info" onDismiss={() => {}}>Hãy lưu trước khi rời trang để không mất dữ liệu đã nhập.</Alert>
        <Alert data-testid="action-only" tone="success" aria-label="Đã xoá 3 tệp" actions={<Button variant="secondary" size="sm">Hoàn tác</Button>} />
        <Alert data-testid="full" tone="error" live="assertive" title="Không kết nối được máy chủ" actions={<Button size="sm">Thử lại</Button>} onDismiss={() => {}}>
          Kiểm tra kết nối mạng rồi thử lại.
        </Alert>
      </div>
    </NovaProvider>
  );
}
