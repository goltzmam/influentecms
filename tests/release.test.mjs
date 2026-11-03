import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';import {migrationSql} from '../scripts/migration-sql.mjs';
test('Publicação aplica migrations de forma transacional e repetível sem apagar conteúdo',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;grant usage on schema auth,public,storage to anon,authenticated,service_role;create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);`);
 const files=(await readdir('supabase/migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)).sort();
 for(let round=0;round<2;round++){
 for(const file of files){const version=file.split('_')[0],name=file.replace(/^\d+_/,'').replace(/\.sql$/,'');await db.exec(migrationSql({version,name,source:await readFile(`supabase/migrations/${file}`,'utf8')}));}
 if(round===0)await db.exec("insert into organizations(name) values ('Conteúdo preservado')");
 }
 assert.equal((await db.query('select count(*)::int as total from supabase_migrations.schema_migrations')).rows[0].total,files.length);
 assert.equal((await db.query('select name from organizations')).rows[0].name,'Conteúdo preservado');
 }finally{await db.close();}
});
