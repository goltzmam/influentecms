import {parseDocument} from 'htmlparser2';
import {findAll,getOuterHTML,textContent} from 'domutils';
import type {CloneDocument} from './document.ts';
export function internalPath(value:string,source:string):string|null {
 try{const u=new URL(value,source),base=new URL(source);if(!['http:','https:'].includes(u.protocol)||u.hostname.replace(/^www\./,'')!==base.hostname.replace(/^www\./,'')||u.username||u.password)return null;
 if(/\/(wp-admin|wp-json|wp-login\.php|xmlrpc\.php|feed)(\/|$)/i.test(u.pathname)||/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|woff2?)(\?|$)/i.test(u.pathname))return null;
 for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);
 if([...u.searchParams.keys()].some(k=>/password|token|secret|nonce|logout/i.test(k)))return null;
 u.searchParams.sort();if((u.pathname+u.search).length>1400)return null;return (u.pathname.replace(/\/+$/,'')||'/')+u.search;
 }catch{return null;}
}
export function discoverPages(html:string,source:string) {
 const links=new Map<string,{path:string;url:string;title:string}>();
 for(const e of findAll(e=>e.name==='a',parseDocument(html).children)){const raw=e.attribs['data-clone-source-link']||e.attribs.href;if(!raw||raw.startsWith('#'))continue;const path=internalPath(raw,source);if(!path||path==='/')continue;const url=new URL(path,new URL(source).origin);url.protocol='https:';links.set(path,{path,url:url.href,title:textContent(e).trim().replace(/\s+/g,' ').slice(0,160)});}
 return [...links.values()];
}
export function localizeLinks(document:CloneDocument,base:string):CloneDocument {
 const root=parseDocument(document.html);
 for(const a of findAll(e=>e.name==='a',root.children)) {
  const raw=a.attribs['data-clone-source-link']||a.attribs.href;if(!raw||/^(#|mailto:|tel:)/.test(raw))continue;
  if(a.attribs['data-clone-user-link']==='true')continue;
  // Explicit user links survive source migration.
  if(a.attribs['data-clone-local-link']&&!a.attribs['data-clone-source-link'])continue;
  let external;try{external=new URL(raw,document.sourceUrl);}catch{continue;}if(/(^|\.)(facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|linkedin\.com|whatsapp\.com)$/.test(external.hostname)){a.attribs.href='#';a.attribs['aria-disabled']='true';a.attribs.title='Configure sua rede social no editor';continue;}
  const path=internalPath(raw,document.sourceUrl);if(path===null)continue;
  const u=new URL(raw,document.sourceUrl);const target=path==='/'?(base||'/'):`${base}/original${path}`;
  a.attribs['data-clone-source-link']=u.href;a.attribs['data-clone-local-link']=target+u.hash;a.attribs.href=target+u.hash;
 }
 return {...document,html:root.children.map(n=>getOuterHTML(n)).join('')};
}
