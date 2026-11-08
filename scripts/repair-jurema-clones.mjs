// Explicit repair of existing clones of the reference requested by the owner.
// No new portal, email, user or domain is created. Existing visual edits survive.
import {createClient} from '@supabase/supabase-js';
import {readPublicResource} from '../src/lib/clone/web.ts';
import {mirrorCloneImages} from '../src/lib/clone/mirror.ts';
import {captureDocument} from '../src/lib/clone/document.ts';
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
let phase="lookup";
try {
 const jobs=await client.from('portal_ai_jobs').select('id,organization_id,generated_portal_id,plan').not('generated_portal_id','is',null).limit(500);if(jobs.error)throw Error('lookup');
 const matches=(jobs.data||[]).filter(j=>{try{return ['juremanews.com.br','www.juremanews.com.br'].includes(new URL(j.plan?.clone?.url).hostname);}catch{return false;}});
 let repaired=0,retained=0,imagesCopied=0;let document;
 for(const job of matches) {
  const portal=await client.from('portals').select('id,settings').eq('id',job.generated_portal_id).eq('organization_id',job.organization_id).maybeSingle();if(portal.error)throw Error('portal');if(!portal.data)continue;
  const existing=await client.from('portal_clone_documents').select('id,draft,published,revision').eq('portal_id',portal.data.id).maybeSingle();if(existing.error)throw Error('document');let id=existing.data?.id;
  if(!id){if(!document){phase='capture';const page=await readPublicResource('https://juremanews.com.br','html',AbortSignal.timeout(120000));document=await captureDocument(page.bytes.toString('utf8'),page.url,AbortSignal.timeout(120000));}const saved=await client.from('portal_clone_documents').insert({organization_id:job.organization_id,portal_id:portal.data.id,job_id:job.id,source_url:document.sourceUrl,draft:document,published:document}).select('id').single();if(saved.error)throw Error('save');id=saved.data.id;phase="copy_images";const mirrored=await mirrorCloneImages(client,job.organization_id,portal.data.id,document);imagesCopied+=mirrored.replacements.size;const own=await client.from("portal_clone_documents").update({draft:mirrored.document,published:mirrored.document}).eq("id",id);if(own.error)throw Error("images");repaired++;}else {retained++;if(existing.data.draft?.assetVersion!==2||existing.data.published?.assetVersion!==2){phase="copy_images";const draft=await mirrorCloneImages(client,job.organization_id,portal.data.id,existing.data.draft);const published=existing.data.published?await mirrorCloneImages(client,job.organization_id,portal.data.id,existing.data.published):null;imagesCopied+=draft.replacements.size+(published?.replacements.size||0);const updated=await client.from("portal_clone_documents").update({draft:draft.document,published:published?.document||null,revision:existing.data.revision+1}).eq("id",id).eq("revision",existing.data.revision);if(updated.error)throw Error("images");}}
  if(portal.data.settings.cloneDocumentId!==id){const saved=await client.from('portals').update({settings:{...portal.data.settings,cloneDocumentId:id}}).eq('id',portal.data.id).eq('organization_id',job.organization_id);if(saved.error)throw Error('binding');}
 }
 console.log(JSON.stringify({check:'Jurema structural clone repair',status:'PASS',matched:matches.length,repaired,retained,imagesCopied}));
}catch(error){console.log(JSON.stringify({check:'Jurema structural clone repair',status:'FAIL',phase,code:error?.code||error?.name||"unknown"}));process.exitCode=1;}
