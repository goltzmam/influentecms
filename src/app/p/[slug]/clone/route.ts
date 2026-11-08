import {publicClient} from '@/lib/supabase/public';
import {serviceClient} from '@/lib/supabase/service';
import {renderDocument,documentPage,nativeContentPage,type CloneDocument} from '@/lib/clone/document';
import {localizeLinks,internalPath} from '@/lib/clone/links';
import {processClonePages} from '@/lib/clone/catalog';
export const runtime='nodejs';export const maxDuration=300;
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params,client=publicClient(),u=new URL(request.url);
 const portal=await client.from('portals').select('id').eq('slug',slug).single();if(portal.error)return new Response('Portal não encontrado.',{status:404});
 const root=await client.rpc('get_public_clone',{target:portal.data.id});if(root.error||!root.data)return new Response('Layout não publicado.',{status:404});
 const base=request.headers.get('x-portal-host')?'':`/p/${slug}`;
 const sourcePath=u.searchParams.get('sourcePath');let document:CloneDocument=root.data;
 if(sourcePath){
  const path=internalPath(sourcePath,root.data.sourceUrl);if(!path)return new Response('Página não encontrada.',{status:404});
  let page=await client.rpc('get_public_clone_page',{target:portal.data.id,page_path:path});
  if(!page.data){try{
    const service=await serviceClient();const known=await service.from('portal_clone_pages').select('id,status').eq('portal_id',portal.data.id).eq('path',path).eq('kind','page').maybeSingle();
    if(known.data?.status==='pending')await processClonePages(service,portal.data.id,path,{limit:1});
    page=await client.rpc('get_public_clone_page',{target:portal.data.id,page_path:path});
  }catch{/* Keep navigation local when a reference is unavailable. */}}
  document=page.data?{...page.data,css:(root.data.css+'\n'+page.data.css).slice(0,1800000)}:nativeContentPage(root.data,'Página em importação',`<p>Esta página está sendo preparada neste portal. Tente novamente em instantes.</p><a data-clone-user-link="true" data-clone-local-link="${base}/original${path.replaceAll('&','&amp;').replaceAll('\"','&quot;')}" href="${base}/original${path.replaceAll('&','&amp;').replaceAll('\"','&quot;')}">Atualizar página</a>`);
 }else{
  const path=u.searchParams.get('path')||'';document=documentPage(root.data,path);
  if(path&&!root.data.pages?.some((p:{path:string})=>p.path===path)){
   const[kind,pageSlug]=path.split('/');if(!['noticia','pagina'].includes(kind))return new Response('Página não encontrada.',{status:404});
   let query=client.from(kind==='noticia'?'articles':'pages').select(kind==='noticia'?'title,content,cover_url':'title,content').eq('portal_id',portal.data.id).eq('slug',pageSlug);
   query=kind==='noticia'?query.in('status',['published','scheduled']).lte('publish_at',new Date().toISOString()):query.eq('published',true);
   const content=await query.single();if(content.error)return new Response('Página não publicada.',{status:404});
   const value=content.data as unknown as {title:string;content:string;cover_url?:string};document=nativeContentPage(root.data,value.title,value.content,value.cover_url||'');
  }
 }
 document=localizeLinks(document,base);
 const token=u.searchParams.get('token')?.match(/^[a-f0-9-]{36}$/)?.[0]||crypto.randomUUID();
 return new Response(renderDocument(document,token),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"frame-ancestors 'self'"}});
}
