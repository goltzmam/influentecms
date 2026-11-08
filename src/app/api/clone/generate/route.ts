import { z } from "zod";
import { apiOwner, jsonBody, ApiFailure, apiError } from "@/lib/ai/access";
import { referenceUrl } from "@/lib/ai/schema";
import { generateClone } from "@/lib/clone/generate";
export const runtime="nodejs";
export const maxDuration=300;
const inputSchema=z.object({url:referenceUrl,name:z.string().trim().max(120).optional(),brief:z.string().trim().max(5000).optional()});
export async function POST(request:Request) {
 let auth:Awaited<ReturnType<typeof apiOwner>>|undefined,jobId:string|undefined;
 try{
  auth=await apiOwner(request,true);
  const parsed=inputSchema.safeParse(await jsonBody(request,12000));
  if(!parsed.success)throw new ApiFailure(400,parsed.error.issues[0]?.message||"Confira o endereço da referência.");
  const start=await auth.client.rpc("start_portal_ai_job",{p_organization:auth.organizationId,p_brief:`Clone: ${parsed.data.url}\n${parsed.data.brief||"Importar portal de referência."}`,p_references:[parsed.data.url]});
  if(start.error)throw new ApiFailure(/ai_rate_limit/.test(start.error.message)?429:409,/ai_rate_limit/.test(start.error.message)?"Limite de criações atingido. Aguarde para importar novamente.":"Já existe um projeto em processamento. Aguarde e tente novamente.");
  jobId=start.data;
  const result=await generateClone(parsed.data,request.signal);
  const saved=await auth.client.rpc("finish_portal_ai_job",{p_job:jobId,p_plan:result.plan,p_model:result.model,p_references:result.references,p_warnings:result.warnings,p_failed:false});
  if(saved.error)throw new ApiFailure(500,"Não foi possível salvar a importação. Consulte o histórico antes de tentar novamente.");
  return Response.json({jobId,plan:result.plan,references:result.references,warnings:result.warnings},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(auth&&jobId)await auth.client.rpc("finish_portal_ai_job",{p_job:jobId,p_plan:null,p_model:null,p_references:[],p_warnings:["clone_read_failed"],p_failed:true});
  if(!(error instanceof ApiFailure))return apiError(new ApiFailure(422,"Não foi possível ler esse portal. Confira se a página é pública e possui notícias acessíveis. Sites protegidos ou carregados apenas por scripts podem exigir outra referência."));
  return apiError(error);
 }
}
