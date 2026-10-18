import {renderToString} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {UnsavedChangesProvider,useUnsavedChanges} from '../../src/providers/unsaved-changes/index.js';
function Entry(){useUnsavedChanges({id:'one',scopeKey:'a',revision:1,dirty:true});return <p>Draft</p>;}
it('does not register browser navigation guards or invoke prompt rendering on the server',()=>{expect(typeof window).toBe('undefined');const prompt=vi.fn();const tree=<UnsavedChangesProvider renderPrompt={prompt}><Entry/></UnsavedChangesProvider>;expect(renderToString(tree)).toBe('<p>Draft</p>');expect(renderToString(tree)).toBe('<p>Draft</p>');expect(prompt).not.toHaveBeenCalled();});
