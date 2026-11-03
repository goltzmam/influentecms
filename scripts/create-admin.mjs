import {bootstrapOwner} from './bootstrap-owner.mjs';
try{
 const result=await bootstrapOwner({url:process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY,publicKey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
 console.log(result.created?'Administrador criado e acesso verificado.':'Administrador já provisionado; nenhuma senha foi alterada.');
}catch(error){console.error(error instanceof Error?error.message:'Falha no provisionamento.');process.exitCode=1;}
