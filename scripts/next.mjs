import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Keep inherited proxy routing and trust. Internal loopback services are local.
const noProxy=[...new Set([...(process.env.NO_PROXY||'').split(','),...(process.env.no_proxy||'').split(','),'localhost','127.0.0.1','::1'].filter(Boolean))].join(',');
const child=spawn(process.execPath,['--use-env-proxy',fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,NO_PROXY:noProxy,no_proxy:noProxy}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Não foi possível iniciar Next.js. Verifique npm ci e Node 24.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
