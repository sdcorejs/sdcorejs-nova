// case-p2-d04-ac01-types: public resolution runs after parent integration.
import { Tree, TreeItem, type TreeProps, type TreeSource, type TreeItemProps } from '@sdcorejs/nova/tree';
import { Tree as RootTree } from '@sdcorejs/nova';
type Entity={code:number;title:string;nodes:readonly Entity[]};
const roots:readonly Entity[]=[];
const source:TreeSource<Entity,number>={mode:'static',roots,getChildren:entity=>entity.nodes};
const props:TreeProps<Entity,number>={scopeKey:'types',source,getKey:entity=>entity.code,getLabel:entity=>entity.title,expandedKeys:[],onExpandedKeysChange:keys=>{const values:readonly number[]=keys;void values;},maxDepth:4,renderItem:entity=>entity.title,actions:[{id:'open',label:'Open',onAction:entity=>{const data:Entity=entity;void data;}}]};
export const valid=<><Tree {...props}/><RootTree {...props}/></>;
export type PublicItem=TreeItemProps;
void TreeItem;
// @ts-expect-error controlled expansion is required
export const missing=<Tree scopeKey="types" source={source} getKey={entity=>entity.code} getLabel={entity=>entity.title}/>;
// @ts-expect-error selected keys must match the accessor key type
export const wrong=<Tree<Entity,number> {...props} selectedKeys={['wrong']}/>;
// @ts-expect-error static mode cannot accept a lazy transport
export const mixed:TreeSource<Entity,number>={mode:'static',roots,getChildren:entity=>entity.nodes,loadChildren:async()=>[]};
