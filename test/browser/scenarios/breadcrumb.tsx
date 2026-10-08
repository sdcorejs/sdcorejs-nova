import { Breadcrumb } from '../../../src/components/breadcrumb/index.js';
import { Link } from '../../../src/components/link/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

const ITEMS = [
  { id: 'home', label: 'Trang chủ', href: '/' },
  { id: 'docs', label: 'Tài liệu dự án', href: '/docs' },
  { id: 'files', label: 'Tệp đính kèm', href: '/docs/files' },
  { id: 'year', label: 'Năm 2026', href: '/docs/files/2026' },
  { id: 'current', label: 'Báo cáo tài chính quý ba', href: '/docs/files/2026/q3' },
];

export default function BreadcrumbScenario() {
  return (
    <>
      <NovaProvider>
        <div data-testid="ltr"><Breadcrumb items={ITEMS} /></div>
        <p><Link href="javascript:alert(1)" data-testid="unsafe">Không điều hướng</Link></p>
      </NovaProvider>
      <NovaProvider dir="rtl" locale="en">
        <div data-testid="rtl"><Breadcrumb items={ITEMS.slice(0, 3)} label="RTL" /></div>
      </NovaProvider>
    </>
  );
}

// custom renderer containment and touch targets.
// `mount` takes precedence over the default export and renders the original scenario too.
import { createRoot } from 'react-dom/client';

const LONG = 'Thư_mục_tổ_tiên_có_tên_cực_kỳ_dài_không_có_điểm_ngắt_dòng_dùng_để_kiểm_tra_việc_thu_gọn_không_làm_tràn_trang';

function CustomRenderer() {
  return (
    <NovaProvider>
      <div data-testid="custom">
        <Breadcrumb
          label="Tùy biến"
          items={[{ id: 'root', label: 'Gốc', href: '/' }, { id: 'long', label: LONG, href: '/long' }, { id: 'here', label: 'Ở đây' }]}
          renderLink={(item) => <a href={item.href} data-router="">{item.label}</a>}
        />
      </div>
    </NovaProvider>
  );
}

export function mount(container: HTMLElement): void {
  createRoot(container).render(<><BreadcrumbScenario /><CustomRenderer /></>);
}
