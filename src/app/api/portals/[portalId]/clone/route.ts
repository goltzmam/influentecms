import {requirePortal} from '@/lib/portal';
import {sameOrigin} from '@/lib/security';
import {jsonBody,ApiFailure,apiError} from '@/lib/ai/access';
import {sanitizeDocument,renderDocument,documentPage} from '@/lib/clone/document';
import {localizeLinks} from '@/lib/clone/links';
import {revalidatePath} from 'next/cache';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{portalId:string}>}){try{
 const {portalId}=await params,{client,portal}=await requirePortal(portalId),u=new URL(request.url),path=u.searchParams.get('path')||'';
 const root=await client.from('portal_clone_documents').select('draft,revision').eq('portal_id',portalId).single();if(root.error)throw new ApiFailure(404,'Layout não encontrado.');
 let result=root.data;
 if(path.startsWith('source:')){const page=await client.from('portal_clone_pages').select('draft,revision').eq('portal_id',portalId).eq('path',path.slice(7)).single();if(page.error||!page.data.draft)throw new ApiFailure(409,'Esta página ainda está sendo importada.');result=page.data;}
 else if(path)result={...result,draft:documentPage(result.draft,path)};
 if(u.searchParams.get('view')==='editor'){
  const doc=localizeLinks({...result.draft,css:path.startsWith('source:')?(root.data.draft.css+'\n'+result.draft.css).slice(0,1800000):result.draft.css},`/p/${portal.slug}`);
  return new Response(renderDocument(doc,u.searchParams.get('token')?.match(/^[a-f0-9-]{36}$/)?.[0]||crypto.randomUUID(),true),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 }
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return apiError(e);}}
export async function PATCH(request:Request,{params}:{params:Promise<{portalId:string}>}){try{
 if(!sameOrigin(request))throw new ApiFailure(403,'Origem não permitida.');const {portalId}=await params,{client}=await requirePortal(portalId),input=await jsonBody(request,5000000);
 if(!Number.isInteger(input.revision))throw new ApiFailure(400,'Recarregue o editor antes de salvar.');const draft=sanitizeDocument(input.document),data={draft,revision:input.revision+1,updated_at:new Date().toISOString(),...(input.publish?{published:draft}:{})};
 const path=typeof input.path==='string'?input.path:'';let query=client.from(path.startsWith('source:')?'portal_clone_pages':'portal_clone_documents').update(data).eq('portal_id',portalId).eq('revision',input.revision);if(path.startsWith('source:'))query=query.eq('path',path.slice(7));
 const result=await query.select('revision').maybeSingle();if(result.error)throw new ApiFailure(500,'Não foi possível salvar o layout.');if(!result.data)throw new ApiFailure(409,'O layout foi alterado em outra aba. Recarregue para continuar.');revalidatePath('/','layout');return Response.json({revision:result.data.revision,published:!!input.publish});
}catch(e){return apiError(e);}}
