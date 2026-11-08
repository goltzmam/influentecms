import {createHash} from "node:crypto";
import sharp from "sharp";
import {parseDocument} from "htmlparser2";
import {findAll} from "domutils";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {CloneDocument} from "./document.ts";
import {readPublicResource} from "./web.ts";
export async function mirrorCloneImages(client:SupabaseClient,organizationId:string,portalId:string,document:CloneDocument,read=readPublicResource) {
 const urls=new Set<string>();const root=parseDocument([document.html,...(document.pages||[]).map(p=>p.html)].join(""));
 const add=(url:string)=>{if(/^https:\/\//.test(url)&&!/\.(woff2?|ttf|eot|svg)(\?|$)/i.test(url))urls.add(url);};
 for(const e of findAll(()=>true,root.children)){if(e.name==='img'){if(e.attribs["data-img-url"])add(e.attribs["data-img-url"]);if(e.attribs.src)add(e.attribs.src);for(const p of (e.attribs.srcset||'').split(','))add(p.trim().split(/\s+/)[0]);}for(const m of (e.attribs.style||'').matchAll(/url\(["']?(https:[^"')\s]+)["']?\)/g))add(m[1]);}
 const warnings:string[]=[],replacements=new Map<string,string>();
 const known=await client.from('media').select('name,url').eq('portal_id',portalId);if(known.error)throw Error('media lookup');const existing=new Map((known.data||[]).map(x=>[x.name,x.url]));
 const list=[...urls].slice(0,120),budget=AbortSignal.timeout(100000);let next=0;
 await Promise.all(Array.from({length:6},async()=>{for(let i=next++;i<list.length;i=next++){const url=list[i];const name=`Clone asset ${createHash('sha256').update(url).digest('hex')}`;if(existing.has(name)){replacements.set(url,existing.get(name)!);continue;}let path='';try{
  const file=await read(url,'image',budget);const metadata=await sharp(file.bytes,{limitInputPixels:20000000}).metadata();if(!['jpeg','png','gif','webp','avif'].includes(metadata.format||'')||(metadata.pages||1)>500)throw Error('format');path=`${organizationId}/${portalId}/${crypto.randomUUID()}.${metadata.format}`;
  const saved=await client.storage.from('portal-media').upload(path,file.bytes,{contentType:file.type,upsert:false});if(saved.error)throw saved.error;const target=client.storage.from('portal-media').getPublicUrl(path).data.publicUrl;
  const row=await client.from('media').insert({organization_id:organizationId,portal_id:portalId,name,path,url:target,size:file.bytes.length});if(row.error)throw row.error;replacements.set(url,target);
 }catch{if(path)await client.storage.from('portal-media').remove([path]);warnings.push('Uma imagem da referência não pôde ser copiada; o endereço original foi preservado.');}}}));
 let html=document.html,css=document.css;for(const [source,target] of [...replacements].sort((a,b)=>b[0].length-a[0].length)){html=html.replaceAll(source,target).replaceAll(source.replaceAll('&','&amp;'),target);css=css.replaceAll(source,target);}
 if(urls.size>120)warnings.push('As primeiras 120 imagens foram processadas. As demais mantêm o endereço da referência.');
 const pages=document.pages?.map(page=>{let html=page.html,css=page.css;for(const[source,target]of replacements){html=html.replaceAll(source,target).replaceAll(source.replaceAll("&","&amp;"),target);css=css.replaceAll(source,target);}return {...page,html,css};});
 return {document:{...document,html,css,pages},replacements,warnings:[...new Set(warnings)]};
}
