// Server Component page: server-compatible Nova components are rendered here
// directly (no client boundary); interactive parts live in ./client-demo.jsx.
import { Badge } from '@sdcorejs/nova/badge';
import { Button } from '@sdcorejs/nova/button';
import { Card, Section } from '@sdcorejs/nova/card';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { Empty, Skeleton } from '@sdcorejs/nova/data-state';
import { Link } from '@sdcorejs/nova/link';
import { NovaProvider } from '@sdcorejs/nova/theme';

import { ClientDemo } from './client-demo.jsx';

export default function Page() {
  return (
    <NovaProvider theme="system" locale="vi">
      <main className="fixture-surface">
        <Card data-testid="server-card">
          <Section title="Hồ sơ máy chủ" description="Render trong Server Component" actions={<Badge tone="success">Đã xác minh</Badge>}>
            <Badge data-testid="server-badge">{0}</Badge>
            <Link href="https://example.com" target="_blank">Trang ngoài</Link>
          </Section>
        </Card>
        <Empty title="Chưa có dữ liệu" />
        <Skeleton />
        <Button variant="secondary">Nút từ Server Component</Button>
        <Checkbox label="Checkbox từ Server Component" name="server-flag" />
        <ClientDemo />
      </main>
    </NovaProvider>
  );
}
