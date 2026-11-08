import {requirePortal} from '@/lib/portal';
import {sameOrigin} from '@/lib/security';
import {apiError,ApiFailure,jsonBody} from '@/lib/ai/access';
import {seedCloneCatalog,processClonePages} from '@/lib/clone/catalog';
export const runtime='nodejs';export const maxDuration=300;
export async function GET(request:Request,{params}:{params:Promise<{portalId:string}>}){try{
 const {portalId}=await params,{client}=await requirePortal(portalId);const q=new URL(request.url).searchParams.get('q')?.slice(0,120)||'';
 let query=client.from('portal_clone_pages').select('id,path,title,status,revision').eq('portal_id',portalId).eq('kind','page').order('path').limit(500);if(q)query=query.ilike('path','%'+q.replace(/[%_]/g,'')+'%');
 const [list,pending,ready,failed]=await Promise.all([query,client.from('portal_clone_pages').select('id',{count:'exact',head:true}).eq('portal_id',portalId).in('status',['pending','processing']),client.from('portal_clone_pages').select('id',{count:'exact',head:true}).eq('portal_id',portalId).eq('kind','page').eq('status','ready'),client.from('portal_clone_pages').select('id',{count:'exact',head:true}).eq('portal_id',portalId).eq('kind','page').eq('status','failed')]);
 if(list.error||pending.error||ready.error||failed.error)throw new ApiFailure(500,'Não foi possível carregar as páginas.');return Response.json({pages:list.data,pending:pending.count||0,ready:ready.count||0,failed:failed.count||0});
 }catch(e){return apiError(e);}}
export async function POST(request:Request,{params}:{params:Promise<{portalId:string}>}){try{if(!sameOrigin(request))throw new ApiFailure(403,'Origem não permitida.');const {portalId}=await params,{client}=await requirePortal(portalId);const input=await jsonBody(request,4000);await seedCloneCatalog(client,portalId);if(input.retry){const reset=await client.from("portal_clone_pages").update({status:"pending",attempts:0}).eq("portal_id",portalId).eq("kind","page").eq("status","failed");if(reset.error)throw new ApiFailure(500,"Não foi possível retomar as páginas.");return Response.json({retry:true});}if(input.initialize)return Response.json({initialized:true});const result=await processClonePages(client,portalId,typeof input.path==='string'?input.path:undefined);return Response.json(result);}catch(e){return apiError(e);}}
