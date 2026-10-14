export const routes=['forms','actions','navigation','overlays','dates','feedback','utilities'] as const;
export type ShowcaseRoute=typeof routes[number];
export function parseShowcaseHash(hash:string):ShowcaseRoute|'not-found'{const route=hash.replace(/^#\//u,'');return hash===''?'forms':routes.includes(route as ShowcaseRoute)?route as ShowcaseRoute:'not-found';}
export function subscribeHash(listener:()=>void){window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener);}
