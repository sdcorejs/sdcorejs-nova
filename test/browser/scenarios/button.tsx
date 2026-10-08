import { Button, ButtonGroup, IconButton } from '../../../src/components/button/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

const Icon = () => <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" /></svg>;

export default function ButtonScenario() {
  return (
    <NovaProvider>
      <div style={{ inlineSize: '100%', padding: 8, boxSizing: 'border-box' }}>
        <ButtonGroup label="Hành động dài" data-testid="long-group">
          <Button data-testid="long">Lưu tất cả thay đổi và gửi yêu cầu phê duyệt tới quản trị viên ngay bây giờ</Button>
          <Button data-testid="sibling" variant="secondary">Huỷ</Button>
        </ButtonGroup>
        <ButtonGroup label="Công cụ" data-testid="icon-group">
          <IconButton size="sm" label="Đóng" icon={<Icon />} data-testid="icon-1" />
          <IconButton size="sm" label="Xoá" icon={<Icon />} variant="ghost" data-testid="icon-2" />
          <Button size="sm" data-testid="small">Nhỏ</Button>
        </ButtonGroup>
      </div>
    </NovaProvider>
  );
}

// loading geometry fixtures. `mount` takes precedence
// over the default export in the harness and renders the original scenario too.
import { createRoot } from 'react-dom/client';

function LoadingGeometry() {
  return (
    <NovaProvider>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <Button data-testid="save-idle">Lưu thay đổi</Button>
        <Button data-testid="save-loading" loading>Lưu thay đổi</Button>
        <IconButton data-testid="icon-idle" label="Đóng" icon={<Icon />} />
        <IconButton data-testid="icon-loading" label="Đóng" icon={<Icon />} loading />
      </div>
    </NovaProvider>
  );
}

export function mount(container: HTMLElement): void {
  createRoot(container).render(<><ButtonScenario /><LoadingGeometry /></>);
}
