import { readdir, readFile } from 'node:fs/promises';
import {migrationSql} from './migration-sql.mjs';
import {bootstrapOwner} from './bootstrap-owner.mjs';
const vercelBase='https://api.vercel.com';
const projectId=process.env.VERCEL_PROJECT_ID;
function requireValue(name){if(!process.env[name])throw new Error(`Configure ${name} pelo gerenciador seguro de segredos.`);return process.env[name];}
async function api(base,path,token,{method='GET',body}={}){
 const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 let data;try{data=await response.json();}catch{}
 if(!response.ok)throw new Error(`API ${new URL(base).hostname}: HTTP ${response.status}${data?.error?.code?' ('+data.error.code+')':''}`);
 return data;
}
function vercel(path,options){const team=process.env.VERCEL_TEAM_ID;return api(vercelBase,path+(team?(path.includes('?')?'&':'?')+`teamId=${encodeURIComponent(team)}`:''),requireValue('VERCEL_API_TOKEN'),options);}
function supabaseRef(){const url=new URL(requireValue('NEXT_PUBLIC_SUPABASE_URL'));if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw new Error('Use um projeto Supabase hospedado para publicação.');return url.hostname.split('.')[0];}
async function configure(){
 requireValue('VERCEL_PROJECT_ID');
 await vercel(`/v9/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:{framework:'nextjs',nodeVersion:'24.x',buildCommand:'npm run build:vercel',installCommand:'npm ci',rootDirectory:null,outputDirectory:null,autoExposeSystemEnvs:true}});
 const {domains=[]}=await vercel(`/v9/projects/${encodeURIComponent(projectId)}/domains`);
 const host=domains.find(d=>d.name.endsWith('.vercel.app'))?.name;
 const appUrl=process.env.APP_URL||(host?`https://${host}`:undefined);if(!appUrl||!appUrl.startsWith('https://'))throw new Error('Configure APP_URL HTTPS para a implantação.');
 const env=[{key:'NEXT_PUBLIC_SUPABASE_URL',value:requireValue('NEXT_PUBLIC_SUPABASE_URL'),type:'encrypted'},{key:'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',value:requireValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),type:'encrypted'},{key:'APP_URL',value:appUrl,type:'plain'}].map(e=>({...e,target:['production','preview','development']}));
 await vercel(`/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`,{method:'POST',body:env});
 console.log('PASS Vercel: Next.js, Node 24 e variáveis públicas configurados.');
}
async function migrate(){
 const ref=supabaseRef(),token=requireValue('SUPABASE_ACCESS_TOKEN');
 const query=(sql)=>api('https://api.supabase.com',`/v1/projects/${ref}/database/query`,token,{method:'POST',body:{query:sql}});
 await query('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);');
 for(const file of (await readdir('supabase/migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)).sort()){
  const version=file.split('_')[0],name=file.replace(/^\d+_/,'').replace(/\.sql$/,'');
  const source=await readFile(`supabase/migrations/${file}`,'utf8');
  await query(migrationSql({version,name,source}));
  console.log(`PASS migration ${file}`);
 }
 await api('https://api.supabase.com',`/v1/projects/${ref}/config/auth`,token,{method:'PATCH',body:{disable_signup:true}});
 console.log('PASS Supabase: migrations aplicadas e cadastro público desativado.');
 if((projectId&&process.env.VERCEL_API_TOKEN)||(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)){
  const keys=await api('https://api.supabase.com',`/v1/projects/${ref}/api-keys`,token);
  const service=(Array.isArray(keys)?keys:keys?.keys||[]).find(k=>k.name==='service_role');
  if(service?.api_key&&projectId&&process.env.VERCEL_API_TOKEN){await vercel(`/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`,{method:'POST',body:[{key:'SUPABASE_SERVICE_ROLE_KEY',value:service.api_key,type:'sensitive',target:['production','preview']}]});console.log('PASS credencial administrativa configurada somente no servidor Vercel.');}
  else if(projectId&&process.env.VERCEL_API_TOKEN)console.log('PENDENTE: configure a credencial administrativa de servidor na Vercel; o valor não foi retornado pelo provedor.');
  if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){if(!service?.api_key)throw new Error('A API não retornou a chave necessária ao provisionamento do proprietário.');const result=await bootstrapOwner({url:requireValue('NEXT_PUBLIC_SUPABASE_URL'),serviceKey:service.api_key,publicKey:requireValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});console.log(result.created?'PASS administrador criado e login verificado.':'PASS administrador já provisionado; nenhuma senha alterada.');}

 }
 if(process.env.ADMIN_EMAIL&&!process.env.ADMIN_PASSWORD)console.log('INFO ADMIN_PASSWORD ausente: bootstrap inicial não executado; contas existentes não são alteradas.');
}
async function deploy(){
 requireValue('VERCEL_PROJECT_ID');const project=await vercel(`/v9/projects/${encodeURIComponent(projectId)}`);
 if(!project.link?.repoId)throw new Error('Associe o repositório GitHub ao projeto.');
 const deployment=await vercel('/v13/deployments',{method:'POST',body:{name:project.name,project:projectId,target:'production',gitSource:{type:'github',repoId:String(project.link.repoId),ref:project.link.productionBranch||'main'}}});
 console.log(JSON.stringify({deploymentId:deployment.id,url:deployment.url,state:deployment.readyState}));
}
async function status(){const data=await vercel(`/v6/deployments?projectId=${encodeURIComponent(requireValue('VERCEL_PROJECT_ID'))}&limit=3`);console.log(JSON.stringify(data.deployments?.map(d=>({id:d.uid,state:d.state,errorCode:d.errorCode,url:d.url}))));}
try{const command=process.argv[2];if(command==='configure')await configure();else if(command==='migrate')await migrate();else if(command==='deploy')await deploy();else if(command==='status')await status();else throw new Error('Use configure, migrate, deploy ou status.');}catch(e){console.error(e instanceof Error?e.message:'Falha no processo de publicação.');process.exitCode=1;}
