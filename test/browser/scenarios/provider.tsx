import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { NovaProvider, ThemeProvider } from '../../../src/providers/nova/index.js';
import { PortalScope } from '../../../src/providers/nova/portal-scope.js';

// Consumer token override declared on the class passed through `className`
// (unlayered consumer CSS beats nova.tokens) — architecture §8.3.
const CONSUMER_CSS = `
.brand { --nova-color-action: #123456; }
.brand[data-nova-theme="dark"] { --nova-color-action: #654321; }
`;

const PROBES = ['A', 'A-system', 'B', 'B-dark', 'limit-in', 'limit-out'];
const VARS = ['--nova-color-background', '--nova-color-action'];

function Probe({ id }: { id: string }) {
  return <span data-probe={id}>{id}</span>;
}

function App({ host }: { host: HTMLElement | null }) {
  return (
    <>
      <NovaProvider theme="dark" className="brand" locale="en" dir="rtl" portalContainer={host}>
        <Probe id="A" />
        <ThemeProvider theme="system"><Probe id="A-system" /></ThemeProvider>
        <PortalScope><Probe id="A-portal" /></PortalScope>
      </NovaProvider>
      <NovaProvider theme="light" portalContainer={host}>
        <Probe id="B" />
        <ThemeProvider theme="dark"><Probe id="B-dark" /></ThemeProvider>
        <PortalScope><Probe id="B-portal" /></PortalScope>
      </NovaProvider>
      <div data-ancestor="" className="ancestor">
        <NovaProvider><Probe id="limit-in" /></NovaProvider>
        <Probe id="limit-out" />
      </div>
    </>
  );
}

function read(): Record<string, Record<string, string>> {
  const values: Record<string, Record<string, string>> = {};
  for (const element of document.querySelectorAll<HTMLElement>('[data-probe]')) {
    const style = getComputedStyle(element);
    values[element.dataset.probe!] = Object.fromEntries(VARS.map((name) => [name, style.getPropertyValue(name).trim()]));
  }
  return values;
}

export function mount(container: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = CONSUMER_CSS;
  document.head.append(style);
  const host = document.createElement('div');
  host.id = 'shared-host';
  document.body.append(host);

  container.innerHTML = renderToString(<App host={null} />);
  // Ancestor override without a class (documented limitation, §8.3).
  container.querySelector<HTMLElement>('[data-ancestor]')!.style.setProperty('--nova-color-action', 'red');
  const state = window as unknown as { __before: unknown; __recoverable: string[]; __read: typeof read; __probes: string[] };
  state.__before = read();
  state.__recoverable = [];
  state.__read = read;
  state.__probes = PROBES;
  hydrateRoot(container, <App host={host} />, {
    onRecoverableError: (error) => {
      state.__recoverable.push(String(error));
    },
  });
}
