import {createClient} from '@supabase/supabase-js';
export async function bootstrapOwner({url,serviceKey,publicKey,email,password}){
 if(!email||!password||!serviceKey||!url)throw new Error('Configure ADMIN_EMAIL, ADMIN_PASSWORD e acesso administrativo ao projeto.');
 if(password.length<12)throw new Error('A senha administrativa deve ter pelo menos 12 caracteres.');
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let existing;
 for(let page=1;page<=20;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)throw new Error('Não foi possível verificar o usuário administrativo.');existing=data.users.find(u=>u.email?.toLowerCase()===email.trim().toLowerCase());if(existing||data.users.length<1000)break;}
 if(existing){const {data,error}=await admin.from('organization_members').select('organization_id,role').eq('user_id',existing.id).maybeSingle();if(error)throw new Error('Não foi possível verificar a autorização existente.');if(data?.role==='owner')return {created:false,userId:existing.id};throw new Error('Já existe uma conta com esse e-mail sem permissão de proprietário; revise o acesso no Supabase antes do bootstrap.');}
 const {data,error}=await admin.auth.admin.createUser({email:email.trim(),password,email_confirm:true});if(error)throw new Error('O provedor recusou a criação do administrador.');
 const id=data.user.id;
 try{const {error:provisionError}=await admin.rpc('provision_owner',{owner_id:id});if(provisionError)throw new Error('Falha ao provisionar a organização privada.');}
 catch(e){const {error:cleanup}=await admin.auth.admin.deleteUser(id);if(cleanup)throw new Error('Falha no bootstrap e na remoção da conta incompleta. Revise Supabase Auth.');throw e;}
 // Once authorization exists, preserve the owner even if a later connectivity check fails.
 if(publicKey){const userClient=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});const result=await userClient.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw new Error('Administrador provisionado, mas a verificação de login falhou. Revise a configuração sem recriar a conta.');const membership=await userClient.from('organization_members').select('role').eq('user_id',id).single();await userClient.auth.signOut({scope:'local'});if(membership.error||membership.data?.role!=='owner')throw new Error('Administrador provisionado, mas a verificação da autorização falhou.');}
 return {created:true,userId:id};
}
