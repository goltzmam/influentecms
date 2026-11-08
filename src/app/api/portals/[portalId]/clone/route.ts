import { requirePortal } from "@/lib/portal";
import { sameOrigin } from "@/lib/security";
import { jsonBody, ApiFailure, apiError } from "@/lib/ai/access";
import { sanitizeDocument, renderDocument,documentPage } from "@/lib/clone/document";
import { revalidatePath } from "next/cache";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{portalId:string}>}) {
 try {const {portalId}=await params;const {client}=await requirePortal(portalId);const result=await client.from("portal_clone_documents").select("draft,revision").eq("portal_id",portalId).single();if(result.error)throw new ApiFailure(404,"Layout importado não encontrado.");const url=new URL(request.url);if(url.searchParams.get("view")==="editor")return new Response(renderDocument(documentPage(result.data.draft,url.searchParams.get("path")||""), url.searchParams.get("token")?.match(/^[a-f0-9-]{36}$/)?.[0]||crypto.randomUUID(),true),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});return Response.json(result.data,{headers:{"Cache-Control":"no-store"}});}catch(e){return apiError(e);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{portalId:string}>}) {
 try {if(!sameOrigin(request))throw new ApiFailure(403,"Origem não permitida.");const {portalId}=await params;const {client}=await requirePortal(portalId);const input=await jsonBody(request,5000000);if(!Number.isInteger(input.revision))throw new ApiFailure(400,"Recarregue o editor antes de salvar.");const draft=sanitizeDocument(input.document);const data={draft,revision:input.revision+1,updated_at:new Date().toISOString(),...(input.publish?{published:draft}:{})};const result=await client.from("portal_clone_documents").update(data).eq("portal_id",portalId).eq("revision",input.revision).select("revision").maybeSingle();if(result.error)throw new ApiFailure(500,"Não foi possível salvar o layout.");if(!result.data)throw new ApiFailure(409,"O layout foi alterado em outra aba. Recarregue para continuar.");revalidatePath("/","layout");return Response.json({revision:result.data.revision,published:!!input.publish});}catch(e){return apiError(e);}
}
