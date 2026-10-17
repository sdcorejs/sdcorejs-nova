import {expect,it} from 'vitest';
import {renderToString} from 'react-dom/server';
import {ColorInput} from '../../src/components/color-input/index.js';
it('case-p2-f04-ac01-ssr renders without DOM access, mutation, or unsafe color style',()=>{
 expect(typeof document).toBe('undefined');let proposals=0;const html=renderToString(<ColorInput label="Color" value={null} onValueChange={()=>proposals++}/>);expect(html).toContain('type="color"');expect(html).toContain('type="text"');expect(html).toContain('value="#000000"');expect(html).not.toContain('style=');expect(proposals).toBe(0);
 const unsafe=renderToString(<ColorInput aria-label="Color" value="url(https://example.test/)" onValueChange={()=>proposals++}/>);expect(unsafe).not.toContain('style=');expect(unsafe).toContain('aria-invalid="true"');expect(proposals).toBe(0);
});
