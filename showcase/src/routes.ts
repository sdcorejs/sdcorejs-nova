export function parseShowcaseHash(hash:string):'forms'|'not-found'{
 return hash===''||hash==='#/forms'?'forms':'not-found';
}
export function subscribeHash(listener:()=>void){
 window.addEventListener('hashchange',listener);
 return ()=>window.removeEventListener('hashchange',listener);
}
