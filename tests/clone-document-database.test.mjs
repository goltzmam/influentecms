import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {aiDatabase} from './helpers/ai-database.mjs';
test('Layouts importados isolam rascunhos por organização e publicam somente a versão confirmada',async()=>{
 const db=await aiDatabase();const [u,v,e,o,q,p,r,d]=Array.from({length:8},()=>randomUUID());
 try{await db.exec(`insert into auth.users values('${u}'),('${v}'),('${e}');insert into organizations(id,name) values('${o}','A'),('${q}','B');insert into organization_members(organization_id,user_id) values('${o}','${u}'),('${q}','${v}');insert into portals(id,organization_id,name,slug) values('${p}','${o}','A','a'),('${r}','${q}','B','b');insert into portal_editors(organization_id,portal_id,user_id,email) values('${o}','${p}','${e}','editor@example.test');set role authenticated;set request.jwt.claim.sub='${u}';`);
 await db.query('insert into portal_clone_documents(id,organization_id,portal_id,source_url,draft)values($1,$2,$3,$4,$5)',[d,o,p,'https://example.com',JSON.stringify({html:'rascunho',css:''})]);
 await db.exec(`set request.jwt.claim.sub='${v}';`);assert.equal((await db.query('select count(*)::int n from portal_clone_documents')).rows[0].n,0);
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select draft from portal_clone_documents'),/permission denied/);assert.equal((await db.query('select get_public_clone($1) doc',[p])).rows[0].doc,null);
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${u}';`);await db.query('update portal_clone_documents set published=$1 where id=$2',[JSON.stringify({html:'publicado',css:''}),d]);
 await db.exec(`set request.jwt.claim.sub='${e}';`);await db.query('update portal_clone_documents set draft=$1 where id=$2',[JSON.stringify({html:'novo rascunho',css:''}),d]);await assert.rejects(db.query('update portal_clone_documents set organization_id=$1 where id=$2',[q,d]),/row-level security/);
 await db.exec('reset role;set role anon;');assert.equal((await db.query('select get_public_clone($1) doc',[p])).rows[0].doc.html,'publicado');
 }finally{await db.close();}
});

test('Catálogo suporta mais de 12 páginas, isola rascunhos e controla concorrência de importação',async()=>{
 const db=await aiDatabase();const[u,v,o,q,p]=Array.from({length:5},()=>randomUUID());try{
 await db.exec(`insert into auth.users values('${u}'),('${v}');insert into organizations(id,name) values('${o}','A'),('${q}','B');insert into organization_members(organization_id,user_id) values('${o}','${u}'),('${q}','${v}');insert into portals(id,organization_id,name,slug)values('${p}','${o}','Clone','clone');set role authenticated;set request.jwt.claim.sub='${u}';`);
 for(let i=0;i<30;i++)await db.query('insert into portal_clone_pages(portal_id,organization_id,source_url,path)values($1,$2,$3,$4)',[p,o,'https://example.com/page-'+i,'/page-'+i]);
 assert.equal((await db.query('select count(*)::int n from portal_clone_pages')).rows[0].n,30);assert.equal((await db.query('select * from claim_clone_pages($1,3,null)',[p])).rows.length,3);assert.equal((await db.query('select * from claim_clone_pages($1,3,null)',[p])).rows.length,1);assert.equal((await db.query('select * from claim_clone_pages($1,3,null)',[p])).rows.length,0);
 await db.query('update portal_clone_pages set draft=$1,published=$2,status=$3 where path=$4',[JSON.stringify({html:'privado'}),JSON.stringify({html:'publicado'}),'ready','/page-0']);
 await db.exec(`set request.jwt.claim.sub='${v}';`);assert.equal((await db.query('select count(*)::int n from portal_clone_pages')).rows[0].n,0);await assert.rejects(db.query('select * from claim_clone_pages($1,2,null)',[p]),/not_allowed/);
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select draft from portal_clone_pages'),/permission denied/);assert.equal((await db.query('select get_public_clone_page($1,$2) doc',[p,'/page-0'])).rows[0].doc.html,'publicado');
 }finally{await db.close();}
});
