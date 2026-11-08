import type {SupabaseClient} from '@supabase/supabase-js';
import {parseDocument} from 'htmlparser2';
import {findAll,textContent} from 'domutils';
import {discoverPages,internalPath} from './links.ts';
import {captureDocument,type CloneDocument} from './document.ts';
import {readPublicResource} from './web.ts';
import {mirrorCloneImages} from './mirror.ts';
export async function seedCloneCatalog(client:SupabaseClient,portalId:string) {
 const root=await client.from('portal_clone_documents').select('id,organization_id,source_url,draft,catalog_initialized').eq('portal_id',portalId).single();if(root.error)throw root.error;
 if(!root.data.catalog_initialized){
  const d=root.data.draft as CloneDocument;
  const rows=discoverPages(d.html,d.sourceUrl).map(p=>({portal_id:portalId,organization_id:root.data.organization_id,source_url:p.url,path:p.path,title:p.title,kind:'page'}));
  for(const path of ['/wp-sitemap.xml','/sitemap_index.xml','/sitemap.xml'])rows.push({portal_id:portalId,organization_id:root.data.organization_id,source_url:new URL(path,d.sourceUrl).href,path,title:'Mapa de páginas',kind:'sitemap'});
  const saved=await client.from('portal_clone_pages').upsert(rows,{onConflict:'portal_id,path',ignoreDuplicates:true});if(saved.error)throw saved.error;
  for(const p of d.pages||[]){const path=internalPath(p.sourceUrl,d.sourceUrl);if(!path||path==='/')continue;const row=await client.from('portal_clone_pages').upsert({portal_id:portalId,organization_id:root.data.organization_id,source_url:p.sourceUrl,path,title:p.path,kind:'page',status:'ready',draft:{...p,pages:undefined},published:{...p,pages:undefined}},{onConflict:'portal_id,path',ignoreDuplicates:true});if(row.error)throw row.error;}
  const init=await client.from('portal_clone_documents').update({catalog_initialized:true}).eq('id',root.data.id);if(init.error)throw init.error;
 }
 return root.data;
}
export async function processClonePages(client:SupabaseClient,portalId:string,onlyPath?:string,options:{limit?:number;read?:typeof readPublicResource}={}) {
 const root=await seedCloneCatalog(client,portalId);const read=options.read||readPublicResource;
 const claimed=await client.rpc('claim_clone_pages',{target:portalId,page_limit:options.limit||2,only_path:onlyPath||null});if(claimed.error)throw claimed.error;
 let imported=0,failed=0;
 await Promise.all((claimed.data||[]).map(async(row:{id:string;path:string;source_url:string;kind:string;attempts:number})=>{
  try{
   const file=await read(row.source_url,row.kind==='sitemap'?'xml':'html',AbortSignal.timeout(20000));
   if(internalPath(file.url,root.source_url)===null)throw Error('external_redirect');
   let additions:{path:string;url:string;title:string;kind:string}[]=[];
   if(row.kind==='sitemap'){
    const xml=parseDocument(file.bytes.toString('utf8'),{xmlMode:true});
    additions=findAll(e=>e.name==='loc',xml.children).map(e=>textContent(e).trim()).map(url=>({path:internalPath(url,root.source_url),url,title:'',kind:/\.xml(?:\?|$)/i.test(url)?'sitemap':'page'})).filter((p):p is {path:string;url:string;title:string;kind:string}=>!!p.path&&p.path!=='/');
   }else{
    const raw=file.bytes.toString('utf8');additions=discoverPages(raw,file.url).map(p=>({...p,kind:'page'}));
    const captured=await captureDocument(raw,file.url,AbortSignal.timeout(10000),async()=>{throw Error('shared styles');});
    captured.css=captured.css.replace(/@font-face\s*\{[^}]*\}/g,'').slice(0,180000);captured.pages=undefined;
    const mirrored=await mirrorCloneImages(client,root.organization_id,portalId,captured,read);
    const title=findAll(e=>e.name==='h1',parseDocument(captured.html).children)[0];
    const saved=await client.from('portal_clone_pages').update({draft:mirrored.document,published:mirrored.document,status:'ready',title:title?textContent(title).trim().slice(0,160):row.path,updated_at:new Date().toISOString()}).eq('id',row.id).eq('status','processing');if(saved.error)throw saved.error;imported++;
   }
   for(let i=0;i<additions.length;i+=300){const added=await client.from('portal_clone_pages').upsert(additions.slice(i,i+300).map(p=>({portal_id:portalId,organization_id:root.organization_id,source_url:p.url,path:p.path,title:p.title,kind:p.kind})),{onConflict:'portal_id,path',ignoreDuplicates:true});if(added.error)throw added.error;}
   if(row.kind==='sitemap'){const saved=await client.from('portal_clone_pages').update({status:'ready',updated_at:new Date().toISOString()}).eq('id',row.id);if(saved.error)throw saved.error;}
  }catch{failed++;await client.from('portal_clone_pages').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',row.id);}
 }));
 return {imported,failed};
}
