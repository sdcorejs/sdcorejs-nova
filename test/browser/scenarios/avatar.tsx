import { Avatar, AvatarGroup } from '../../../src/components/avatar/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

// 1×1 PNG (data: is allowed by CSP-A img-src).
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default function AvatarScenario() {
  return (
    <NovaProvider>
      <Avatar name="Ảnh hợp lệ" src={PIXEL} size="lg" data-testid="loaded" />
      <Avatar name="Nguyễn An" src="/__missing-avatar__.png" size="lg" data-testid="broken" />
      <Avatar name="" size="lg" data-testid="empty" />
      <AvatarGroup label="Thành viên" max={2} data-testid="group">
        <Avatar name="An" />
        <Avatar name="Bình" />
        <Avatar name="Chi" />
        <Avatar name="Dũng" />
      </AvatarGroup>
    </NovaProvider>
  );
}
