// Runs the local Next.js CLI with telemetry disabled for this child process only
// (no global config, no shared environment change). Usage: node run-next.mjs <build|start> [args]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: here,
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
child.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
