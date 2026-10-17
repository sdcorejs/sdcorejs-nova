import type {QueryNode} from './query-types.js';
type JsonNode={kind:'rule';field:string;operator:string;operand:{kind:'literal';value:unknown}|{kind:'field';field:string}}|{kind:'group';logic:'and'|'or';children:JsonNode[]};
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function text(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
function invalid():never{throw new TypeError('Invalid query tree.');}
function literal(value:unknown):unknown{if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value)){const keys:(string|number)[]=[];for(let i=0;i<value.length;i++){const key:unknown=value[i];if(!Object.hasOwn(value,i)||!(typeof key==='string'||typeof key==='number'&&Number.isFinite(key)))invalid();keys.push(key);}return keys;}return invalid();}
/** Produces a semantic JSON AST. UI metadata and IDs never reach an adapter.
 * Structural validation is iterative and independent of configurable UI limits.
 */
export function serializeQuery(node:QueryNode|null):unknown{
 if(node===null)return null;
 const result:JsonNode[]=[],pending:{input:unknown;target:JsonNode[]}[]=[{input:node,target:result}],seen=new Set<object>(),ids=new Set<string>();
 while(pending.length){const {input,target}=pending.pop()!;if(!record(input)||seen.has(input)||!text(input.id)||ids.has(input.id))invalid();seen.add(input);ids.add(input.id);
  if(input.kind==='rule'){if(!text(input.field)||!text(input.operator)||!record(input.operand))invalid();let operand:Extract<JsonNode,{kind:'rule'}>['operand'];if(input.operand.kind==='literal')operand={kind:'literal',value:literal(input.operand.value)};else if(input.operand.kind==='field'&&text(input.operand.field))operand={kind:'field',field:input.operand.field};else invalid();target.push({kind:'rule',field:input.field,operator:input.operator,operand});}
  else if(input.kind==='group'){if((input.logic!=='and'&&input.logic!=='or')||!Array.isArray(input.children)||input.children.length===0)invalid();const children:JsonNode[]=[];target.push({kind:'group',logic:input.logic,children});for(let i=input.children.length-1;i>=0;i--){if(!Object.hasOwn(input.children,i))invalid();pending.push({input:input.children[i],target:children});}}
  else invalid();
 }
 return result[0];
}