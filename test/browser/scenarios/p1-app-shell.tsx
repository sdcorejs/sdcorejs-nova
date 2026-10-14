import { useState } from 'react';

import { AppShell, Navigation, Sidebar } from '../../../src/components/app-shell/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';

function SidebarContent() {
  const [draft, setDraft] = useState('');
  const [actions, setActions] = useState(0);
  const [navigated, setNavigated] = useState('');
  return <><label>Bản nháp menu<input id="menu-draft" aria-label="Bản nháp menu" value={draft} onChange={event => setDraft(event.target.value)}/></label>
    <button onClick={() => setActions(value => value + 1)}>Hành động menu</button><output aria-label="Số hành động">{actions}</output>
    <output aria-label="Đã điều hướng">{navigated}</output>
    <Navigation label="Điều hướng chính" currentId="files" onNavigate={item => setNavigated(item.id)} items={[
      {id: 'files', label: 'Tệp và tài liệu của tôi', href: '#/files'},
      ...Array.from({length: 25}, (_, index) => ({id: `item-${index}`, label: `Mục điều hướng tiếng Việt rất dài số ${index + 1}`, href: `#/item-${index}`})),
    ]}/></>;
}

export default function AppShellScenario() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const clipped = new URLSearchParams(window.location.search).has('clipped');
  return <><div id="configured-portal" ref={setPortalHost}/><NovaProvider locale="vi" theme={theme} portalContainer={clipped ? portalHost : undefined}>
    <div style={clipped ? {height: 200, overflow: 'hidden', transform: 'translateZ(0)'} : undefined}>
    <AppShell skipLabel="Tới nội dung" header={<button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Đổi giao diện</button>}
    sidebar={<Sidebar label="Không gian làm việc" triggerLabel="Menu"><SidebarContent/></Sidebar>}><h1>Tài liệu</h1><label>Nội dung<input aria-label="Nội dung"/></label></AppShell>
    </div></NovaProvider></>;
}
