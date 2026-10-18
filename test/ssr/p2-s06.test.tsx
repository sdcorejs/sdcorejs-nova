import {expect,it,vi} from 'vitest';
import {renderToString} from 'react-dom/server';
import {useTask} from '../../src/hooks/task/index.js';
import {TaskProvider} from '../../src/providers/task/index.js';
import {JobProgress} from '../../src/components/job-progress/index.js';
it('case-p2-s06-ac01-ssr deterministic idle/initial state without browser globals or starting transports',()=>{
 expect(typeof document).toBe('undefined');expect(typeof window).toBe('undefined');const load=vi.fn(),subscribe=vi.fn(),cancel=vi.fn();
 function Poll(){const task=useTask({id:'job',scopeKey:'account',source:{mode:'poll',load},cancel});return <JobProgress state={task.state} label="Export"/>;}
 function Stream(){const task=useTask({id:'stream',scopeKey:'account',source:{mode:'stream',subscribe},initialState:{id:'stream',status:'running',progress:0}});return <JobProgress state={task.state} label="Stream"/>;}
 const html=renderToString(<TaskProvider><Poll/><Stream/></TaskProvider>);expect(html).toContain('Chưa bắt đầu');expect(html).toContain('Đang thực hiện');expect(html).toContain('aria-valuenow="0"');expect(html).not.toContain('style=');expect(load).not.toHaveBeenCalled();expect(subscribe).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
});
it('SSR raw result renderer preserves callback-bearing objects and zero/false',()=>{const raw={f:()=>false},slot=vi.fn((result:typeof raw)=><span>{String(result.f())}</span>);const html=renderToString(<JobProgress label="Export" state={{id:'job',status:'succeeded',result:raw}} renderResult={slot}/>);expect(slot).toHaveBeenCalledWith(raw);expect(html).toContain('false');});
