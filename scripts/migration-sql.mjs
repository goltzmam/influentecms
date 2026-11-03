export function migrationSql({version,name,source}){
 if(!/^\d+$/.test(version)||!/^[a-zA-Z0-9_]+$/.test(name))throw new Error('Nome de migration inválido.');
 const body=source.replace(/^\s*begin\s*;/i,'').replace(/commit\s*;\s*$/i,'');
 const delimiter=`$migration_${version}$`;if(body.includes(delimiter)||body.includes('$cms$'))throw new Error('Delimitador SQL inválido.');
 return `begin; select pg_advisory_xact_lock(724923); do $cms$ begin if not exists(select 1 from supabase_migrations.schema_migrations where version='${version}') then execute ${delimiter}${body}${delimiter}; insert into supabase_migrations.schema_migrations(version,statements,name) values('${version}',array[]::text[],'${name}'); end if; end $cms$; commit;`;
}
