import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
let client: SupabaseClient,
  organizationId: string,
  userId: string,
  email: string,
  password: string,
  domainId: string;
const suffix = randomUUID().slice(0, 8),
  slug = `portal-${suffix}`;
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Configure Supabase local antes dos testes E2E.");
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error(
      "E2E permitido apenas em Supabase local; nunca executar em produção.",
    );
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  email = `cms-${suffix}@example.test`;
  password = randomBytes(24).toString("base64url");
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  const org = await client
    .from("organizations")
    .insert({ name: `Teste isolado ${suffix}` })
    .select("id")
    .single();
  if (org.error) throw org.error;
  organizationId = org.data.id;
  const member = await client
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: userId });
  if (member.error) throw member.error;
  const domain = await client
    .from("domains")
    .insert({
      organization_id: organizationId,
      portal_id: null,
      hostname: `ai-${suffix}.example.test`,
      verified: true,
    })
    .select("id")
    .single();
  if (domain.error) throw domain.error;
  domainId = domain.data.id;
});
test.afterAll(async () => {
  if (!client) return;
  if (organizationId) {
    const { data: media } = await client
      .from("media")
      .select("path")
      .eq("organization_id", organizationId);
    if (media?.length)
      await client.storage
        .from("portal-media")
        .remove(media.map((m) => m.path));
    const { error } = await client
      .from("organizations")
      .delete()
      .eq("id", organizationId);
    if (error) throw error;
  }
  if (userId) {
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
});

test("Clone recupera importação, mantém rascunhos e abre editor visual com domínio",async({page,request})=>{
 const fixture=await import("../fixtures/ai-blueprint.mjs");
 const plan=structuredClone(fixture.blueprint) as typeof fixture.blueprint & {clone?:unknown};
 plan.slug=slug;
 plan.clone={url:"https://example.com",logo:"",favicon:"",socials:["https://instagram.com/exemplo"],covers:{},report:["Página inicial analisada.","Notícias e páginas convertidas em blocos editáveis."]};
 const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 const auth=await owner.auth.signInWithPassword({email,password});if(auth.error)throw auth.error;
 const started=await owner.rpc("start_portal_ai_job",{p_organization:organizationId,p_brief:"Clone: https://example.com",p_references:["https://example.com"]});if(started.error)throw started.error;
 const finished=await owner.rpc("finish_portal_ai_job",{p_job:started.data,p_plan:plan,p_model:"clone-import",p_references:[{url:"https://example.com",status:"retrieved"}],p_warnings:[],p_failed:false});if(finished.error)throw finished.error;
 expect((await request.post("/api/clone/generate",{data:{url:"https://example.com"},headers:{Origin:"http://127.0.0.1:3100"}})).status()).toBe(401);
 await page.goto("/login");await page.getByLabel("E-mail").fill(email);await page.getByLabel("Senha",{exact:true}).fill(password);await page.getByRole("button",{name:"Entrar no painel"}).click();await expect(page).toHaveURL(/\/painel$/);
 await page.getByRole("link",{name:"Clone",exact:true}).click();await expect(page.getByRole("heading",{name:"Um link. Seu próximo portal."})).toBeVisible();
 for(const width of [320,768,1440]) {await page.setViewportSize({width,height:960});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
 await page.screenshot({path:"/tmp/influente-clone-source.png"});
 await page.getByLabel("Endereço do portal de referência").fill("example.com");await page.getByLabel("Nome do novo portal").fill("Minha Cidade");
 const invalid=await page.request.post("/api/clone/generate",{data:{url:"https://127.0.0.1"},headers:{Origin:"http://127.0.0.1:3100"}});expect(invalid.status()).toBe(400);
 await page.getByRole("button",{name:"Abrir projeto",exact:true}).click();await expect(page.getByRole("heading",{name:"Relatório da importação"})).toBeVisible();
 await expect(page.getByLabel("Publicar também as notícias importadas após minha revisão")).not.toBeChecked();
 await page.getByLabel("Domínio para este portal",{exact:true}).selectOption(domainId);
 await page.getByRole("button",{name:"Pré-visualizar portal"}).click();await expect(page.getByRole("dialog")).toContainText(plan.name);await page.getByRole("button",{name:"Fechar prévia"}).click();
 await page.getByRole("button",{name:"Criar portal editável"}).click();await expect(page).toHaveURL(/\/painel\/[a-f0-9-]+\/homepage\?notice=/);
 const portal=await client.from("portals").select("id,settings").eq("slug",slug).single();if(portal.error)throw portal.error;
 const articles=await client.from("articles").select("status,cover_url").eq("portal_id",portal.data.id);expect(articles.data?.length).toBeGreaterThan(0);for(const a of articles.data||[]){expect(a.status).toBe("draft");expect(a.cover_url).toContain("/storage/v1/object/public/");}
 expect(portal.data.settings.logo).toContain("/storage/v1/object/public/");
 const domains=await client.from("domains").select("portal_id").eq("id",domainId).single();expect(domains.data?.portal_id).toBe(portal.data.id);
 await expect(page.locator(".visual-canvas").first()).toBeVisible();
 await page.screenshot({path:"/tmp/influente-clone-editor.png"});
 const demos=await client.from("campaigns").select("id").eq("portal_id",portal.data.id);expect(demos.data).toHaveLength(0);
});
