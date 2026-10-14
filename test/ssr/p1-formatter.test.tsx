import { renderToReadableStream,renderToString } from 'react-dom/server';
import { describe,expect,it } from 'vitest';
import { NovaProvider } from '../../src/providers/nova/nova-provider.js';
import { useFormatter,useRelativeTime } from '../../src/hooks/formatter/index.js';
const now='2026-10-08T08:30:00Z';
function Probe(){const formatter=useFormatter(),relative=useRelativeTime(now,{now,unit:'second',live:true});return <p>{formatter.number(1234.5)}|{formatter.date('2024-02-29')}|{relative}</p>;}
describe('formatter explicit server snapshots',()=>{
  it('date-only and live relative SSR output uses input snapshots rather than browser/clock effects',()=>{
    expect(typeof window).toBe('undefined');const html=renderToString(<NovaProvider locale="en" timeZone="America/Los_Angeles"><Probe/></NovaProvider>);
    expect(html).toContain('1,234.5');expect(html).toContain(new Intl.DateTimeFormat('en',{timeZone:'UTC'}).format(new Date('2024-02-29T00:00:00Z')));expect(html).toContain('now');expect(html).not.toContain('<script');
  });
  it('concurrent en/vi request roots retain their own formatting and locale',async()=>{
    const outputs=await Promise.all(['en','vi'].map(async locale=>{const stream=await renderToReadableStream(<NovaProvider locale={locale}><Probe/></NovaProvider>);await stream.allReady;return new Response(stream).text();}));
    expect(outputs[0]).toContain('lang="en"');expect(outputs[0]).toContain('1,234.5');expect(outputs[1]).toContain('lang="vi"');expect(outputs[1]).toContain(new Intl.NumberFormat('vi').format(1234.5));expect(outputs[1]).not.toContain('1,234.5');
  });
});
