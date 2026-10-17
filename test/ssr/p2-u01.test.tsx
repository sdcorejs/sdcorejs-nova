import type {Node,VisitResult,SourceFile} from 'typescript';
import {renderToString} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {FileUpload} from '../../src/components/file-upload/index.js';
import {useFileTransfer,type TransferAdapter} from '../../src/hooks/file-transfer/index.js';
it('case-p2-u01-ac01-ssr no File/Blob/DOM construction at module import or server rendering; native chooser and empty queue deterministic',()=>{
 expect(typeof window).toBe('undefined');expect(typeof document).toBe('undefined');vi.stubGlobal('File',undefined);vi.stubGlobal('Blob',undefined);expect(typeof File).toBe('undefined');const adapter:TransferAdapter={upload:vi.fn(async()=>({id:'never'})),download:vi.fn(async()=>{})},onFiles=vi.fn();
 function Consumer(){const transfer=useFileTransfer({adapter});return <><FileUpload onFiles={onFiles} maxFileBytes={0}/><output>{transfer.items.length}</output></>;}
 const first=renderToString(<Consumer/>);expect(first).toBe(renderToString(<Consumer/>));expect(first).toContain('type="file"');expect(first).toContain('Chọn tệp hoặc thả vào đây');expect(first).toContain('<output>0</output>');expect(adapter.upload).not.toHaveBeenCalled();expect(adapter.download).not.toHaveBeenCalled();expect(onFiles).not.toHaveBeenCalled();vi.unstubAllGlobals();
});
it('module/SSR evaluation projection has no browser allocation; full source has no DOM/construction, saving or optional engines',async()=>{
 const ts=await import('typescript');
 // A syntactic execution-boundary projection keeps module initializers, constructor/field
 // initializers, and render bodies. Instance methods and committed effect callbacks do
 // not execute during module import or server render; runtime probes below verify that boundary.
 function evaluationProjection(text:string){
  const ast=ts.createSourceFile('boundary.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const transformed=ts.transform(ast,[context=>root=>{
   const visit=(node:Node):VisitResult<Node>=>{
    if(ts.isMethodDeclaration(node)&&!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))return context.factory.updateMethodDeclaration(node,node.modifiers,node.asteriskToken,node.name,node.questionToken,node.typeParameters,node.parameters,node.type,context.factory.createBlock([]));
    if(ts.isPropertyDeclaration(node)&&node.initializer&&ts.isArrowFunction(node.initializer)&&!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword))return context.factory.updatePropertyDeclaration(node,node.modifiers,node.name,node.questionToken??node.exclamationToken,node.type,context.factory.updateArrowFunction(node.initializer,node.initializer.modifiers,node.initializer.typeParameters,node.initializer.parameters,node.initializer.type,node.initializer.equalsGreaterThanToken,context.factory.createBlock([])));
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['useInsertionEffect','useLayoutEffect','useEffect'].includes(node.expression.text))return context.factory.updateCallExpression(node,node.expression,node.typeArguments,node.arguments.map((arg,index)=>index===0&&ts.isArrowFunction(arg)?context.factory.updateArrowFunction(arg,arg.modifiers,arg.typeParameters,arg.parameters,arg.type,arg.equalsGreaterThanToken,context.factory.createBlock([])):arg));
    return ts.visitEachChild(node,visit,context);
   };return ts.visitNode(root,visit) as SourceFile;
  }]);try{return ts.createPrinter().printFile(transformed.transformed[0]!);}finally{transformed.dispose();}
 }
 for(const file of ['src/hooks/file-transfer/file-transfer.tsx','src/hooks/file-transfer/transfer-queue.ts','src/components/file-upload/file-upload.tsx']){const fullSource=readFileSync(file,'utf8'),source=evaluationProjection(fullSource);expect(source).not.toMatch(/\b(?:window|document)\b|new (?:File|Blob)\s*\(|(?:create|revoke)ObjectURL|saveAs\s*\(/);expect(source).not.toMatch(/from ['"][^'"]*(?:xlsx|pdfjs|monaco|temporal|react-hook-form)/);expect(fullSource).not.toMatch(/\b(?:window|document)\b|new (?:File|Blob)\s*\(|saveAs\s*\(/);expect(fullSource).not.toMatch(/from ['"][^'"]*(?:xlsx|pdfjs|monaco|temporal|react-hook-form)/);}
 for(const negative of ['URL.createObjectURL(file);','class Owner { constructor(){URL.createObjectURL(file);} }','function useFileTransfer(){return URL.createObjectURL(file);}','class Owner {static x=URL.createObjectURL(file);}','(()=>URL.createObjectURL(file))();'])expect(evaluationProjection(negative)).toMatch(/createObjectURL/);
});
it('U01-P5 fresh module import and actual server render allocate no URLs with throwing File/Blob/URL stubs',async()=>{
 const calls={create:0,revoke:0,file:0,blob:0},NativeURL=URL;
 vi.stubGlobal('URL',class extends NativeURL {static override createObjectURL():never{calls.create++;throw Error('SSR URL allocation');}static override revokeObjectURL():never{calls.revoke++;throw Error('SSR URL revocation');}});
 vi.stubGlobal('File',class {constructor(){calls.file++;throw Error('SSR File construction');}});vi.stubGlobal('Blob',class {constructor(){calls.blob++;throw Error('SSR Blob construction');}});
 try{vi.resetModules();const {useFileTransfer:fresh}=await import('../../src/hooks/file-transfer/index.js'),{renderToString:freshRender}=await import('react-dom/server');const adapter:TransferAdapter={upload:vi.fn(async()=>({id:'never'}))};
  function Consumer(){const transfer=fresh({adapter});void transfer.preview('missing');return <output>{transfer.items.length}</output>;}
  expect(freshRender(<Consumer/>)).toBe('<output>0</output>');expect(freshRender(<Consumer/>)).toBe('<output>0</output>');expect(calls).toEqual({create:0,revoke:0,file:0,blob:0});expect(adapter.upload).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
