/// <reference types="vite/client" />
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

// Scenario modules are discovered from test/browser/scenarios/<name>.tsx.
// A scenario exports either a default component
// or `mount(container)` when it needs its own root/hydration setup.
type Scenario = { default?: () => ReactElement; mount?: (container: HTMLElement) => void | Promise<void> };

import.meta.glob(['../../../dist/tokens.css', '../../../dist/styles/*.css'], { eager: true });
const scenarios = import.meta.glob<Scenario>('../scenarios/*.tsx');

async function boot(): Promise<void> {
  const container = document.getElementById('root');
  if (!container) throw new Error('harness root missing');
  const name = new URLSearchParams(window.location.search).get('scenario');
  const load = name ? scenarios[`../scenarios/${name}.tsx`] : undefined;
  if (!load) {
    container.textContent = name ? `unknown scenario: ${name}` : 'harness ready';
    document.body.dataset.harness = 'ready';
    return;
  }
  const scenario = await load();
  if (scenario.mount) {
    await scenario.mount(container);
  } else if (scenario.default) {
    const Component = scenario.default;
    createRoot(container).render(<Component />);
  }
  document.body.dataset.harness = 'ready';
}

void boot();
