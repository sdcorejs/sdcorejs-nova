import type { ReactNode } from 'react';

import { Badge } from '../../../src/components/badge/index.js';
import { Button } from '../../../src/components/button/index.js';
import { Card, CardGroup, Section, SectionItem } from '../../../src/components/card/index.js';
import { Empty } from '../../../src/components/data-state/empty.js';
import { Skeleton } from '../../../src/components/data-state/skeleton.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

const TONES = ['neutral', 'success', 'warning', 'error', 'info'] as const;

function Content({ prefix }: { prefix: string }) {
  return (
    <CardGroup>
      <Card data-testid={`${prefix}-card`}>
        <Section
          headingLevel={3}
          title={<span data-testid={`${prefix}-title`}>Thông tin hồ sơ người dùng với tiêu đề rất dài cần xuống dòng</span>}
          actions={<span data-testid={`${prefix}-actions`}><Button variant="secondary">Chỉnh sửa</Button><a href="#more">Xem thêm</a></span>}
        >
          <SectionItem>
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} data-testid={`${prefix}-badge-${tone}`}>Trạng thái {tone} có nhãn khá dài để kiểm tra xuống dòng</Badge>
            ))}
          </SectionItem>
        </Section>
      </Card>
      <Empty title="Không có dữ liệu" actions={<Button>Tạo mới</Button>} />
      <Skeleton />
    </CardGroup>
  );
}

function Region({ id, children }: { id: string; children: ReactNode }) {
  return <div data-region={id}>{children}</div>;
}

export default function DisplayScenario() {
  return (
    <>
      <Region id="outside"><Content prefix="outside" /></Region>
      <Region id="ancestor"><div className="ancestor-vars" data-testid="ancestor"><Content prefix="ancestor" /></div></Region>
      <Region id="light"><NovaProvider theme="light"><Content prefix="light" /></NovaProvider></Region>
      <Region id="dark"><NovaProvider theme="dark"><Content prefix="dark" /></NovaProvider></Region>
    </>
  );
}

// consumer-owned surfaces.
// A Nova scope is display: contents and never paints; the consumer puts a real
// surface element INSIDE every theme scope, nested theme island and portal content.
import { createRoot } from 'react-dom/client';

import { Breadcrumb } from '../../../src/components/breadcrumb/index.js';
import { Link } from '../../../src/components/link/index.js';
import { DataState, Progress, Spinner } from '../../../src/components/data-state/index.js';
import { ThemeProvider } from '../../../src/providers/nova/index.js';
import { PortalScope } from '../../../src/providers/nova/portal-scope.js';

const SURFACE_CSS = '.consumer-surface { background: var(--nova-color-background); color: var(--nova-color-text); padding: 8px; }';

function Samples({ prefix }: { prefix: string }) {
  return (
    <div data-samples={prefix}>
      <Section title={<span data-testid={`${prefix}-title`}>Tiêu đề độc lập</span>} description={<span data-testid={`${prefix}-desc`}>Mô tả</span>}>
        <p data-testid={`${prefix}-body`}>Nội dung</p>
      </Section>
      <DataState state="error" message="Không tải được" data-testid={`${prefix}-error`} />
      <Spinner label="Đang tải" data-testid={`${prefix}-spinner`} />
      <Progress label="Tiến độ" value={40} data-testid={`${prefix}-progress`} />
      <Progress label="Đang xử lý" data-testid={`${prefix}-indeterminate`} />
      <Breadcrumb items={[{ id: 'home', label: 'Trang chủ', href: '/' }, { id: 'here', label: 'Hiện tại' }]} label={`Đường dẫn ${prefix}`} data-testid={`${prefix}-breadcrumb`} />
      <Link href="/docs" data-testid={`${prefix}-link`}>Tài liệu</Link>
    </div>
  );
}

function Surfaces() {
  return (
    <>
      <Region id="bare-dark"><NovaProvider theme="dark"><Samples prefix="bare-dark" /></NovaProvider></Region>
      <Region id="surface-light"><NovaProvider theme="light"><div className="consumer-surface"><Samples prefix="surface-light" /></div></NovaProvider></Region>
      <Region id="surface-dark"><NovaProvider theme="dark"><div className="consumer-surface"><Samples prefix="surface-dark" /></div></NovaProvider></Region>
      <Region id="island">
        <NovaProvider theme="dark">
          <div className="consumer-surface">
            <ThemeProvider theme="light"><div className="consumer-surface"><Samples prefix="island-light" /></div></ThemeProvider>
            <ThemeProvider theme="light"><Samples prefix="island-bare" /></ThemeProvider>
          </div>
        </NovaProvider>
      </Region>
      <Region id="portal">
        <NovaProvider theme="dark">
          <div className="consumer-surface">
            <PortalScope><div className="consumer-surface" data-testid="portal-surface"><Samples prefix="portal-dark" /></div></PortalScope>
          </div>
        </NovaProvider>
      </Region>
    </>
  );
}

export function mount(container: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = SURFACE_CSS;
  document.head.append(style);
  createRoot(container).render(<DisplayScenario />);
  // outside #root so the original #root checks keep their scope
  const surfaces = document.createElement('div');
  surfaces.id = 'repair-surfaces';
  document.body.append(surfaces);
  createRoot(surfaces).render(<Surfaces />);
}
