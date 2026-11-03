import {spawnSync} from 'node:child_process';
function run(args){const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);}
if(process.env.VERCEL_ENV==='production'){
 if(!process.env.SUPABASE_ACCESS_TOKEN){console.error('Configure SUPABASE_ACCESS_TOKEN em Production antes de publicar.');process.exit(1);}
 run(['--use-env-proxy','scripts/release.mjs','migrate']);
}
// Preview builds never apply migrations or bootstrap a production owner.
run(['node_modules/next/dist/bin/next','build']);
