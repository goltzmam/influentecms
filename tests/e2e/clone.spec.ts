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
 await page.route("**/api/portals/*/clone/pages**",route=>route.fulfill({json:{pages:[],pending:0,ready:0,failed:0}}));
 const fixture=await import("../fixtures/ai-blueprint.mjs");
 const plan=structuredClone(fixture.blueprint) as typeof fixture.blueprint & {clone?:unknown};
 plan.slug=slug;
 plan.clone={url:"https://example.com",logo:"",favicon:"",socials:["https://instagram.com/exemplo"],covers:{},report:["Página inicial analisada.","Notícias e páginas convertidas em blocos editáveis."]};
 const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 const auth=await owner.auth.signInWithPassword({email,password});if(auth.error)throw auth.error;
 const started=await owner.rpc("start_portal_ai_job",{p_organization:organizationId,p_brief:"Clone: https://example.com",p_references:["https://example.com"]});if(started.error)throw started.error;
 const capturedDoc=await owner.from("portal_clone_documents").insert({organization_id:organizationId,job_id:started.data,source_url:"https://example.com",draft:{html:`<header><nav>Menu original<a href="https://example.com/quem-somos/">Quem somos local</a></nav></header><main class="original-grid"><section><h1>${plan.name}</h1><p>Texto original editável</p></section><aside>Publicidade</aside></main><footer>Rodapé original</footer>`,css:"body{margin:0;font-family:Arial}.original-grid{display:grid;grid-template-columns:2fr 1fr;gap:24px;padding:20px}header,footer{background:#111;color:white;padding:20px}@media(max-width:600px){.original-grid{grid-template-columns:1fr}}",bodyClass:"home",sourceUrl:"https://example.com"},published:{html:`<header><nav>Menu original<a href="https://example.com/quem-somos/">Quem somos local</a></nav></header><main><h1>${plan.name}</h1></main><footer>Rodapé original</footer>`,css:"body{font-family:Arial}",bodyClass:"home",sourceUrl:"https://example.com"}}).select("id").single();if(capturedDoc.error)throw capturedDoc.error;
 (plan.clone as {documentId?:string}).documentId=capturedDoc.data.id;
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
 await page.getByRole("button",{name:"Pré-visualizar portal"}).click();await expect(page.getByRole("dialog").frameLocator("iframe").getByRole("heading",{name:plan.name,exact:true})).toBeVisible();await page.getByRole("button",{name:"Fechar prévia"}).click();
 await page.getByRole("button",{name:"Criar portal editável"}).click();await expect(page).toHaveURL(/\/painel\/[a-f0-9-]+\/homepage\?notice=/);
 const portal=await client.from("portals").select("id,settings").eq("slug",slug).single();if(portal.error)throw portal.error;
 const articles=await client.from("articles").select("status,cover_url").eq("portal_id",portal.data.id);expect(articles.data?.length).toBeGreaterThan(0);for(const a of articles.data||[]){expect(a.status).toBe("draft");}

 const subpage={html:'<header>Menu próprio</header><main><h1>Quem somos importado</h1><p>Conteúdo editável da página interna.</p></main><footer>Rodapé próprio</footer>',css:'body{margin:0}',bodyClass:'',sourceUrl:'https://example.com/quem-somos/'};
 const catalog=await client.from("portal_clone_pages").insert({organization_id:organizationId,portal_id:portal.data.id,source_url:subpage.sourceUrl,path:"/quem-somos",title:"Quem somos",status:"ready",draft:subpage,published:subpage});if(catalog.error)throw catalog.error;
 const domains=await client.from("domains").select("portal_id").eq("id",domainId).single();expect(domains.data?.portal_id).toBe(portal.data.id);
 const editorFrame=page.frameLocator('iframe[title="Editor do layout importado"]');
 await expect(editorFrame.getByRole("heading",{name:plan.name,exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Menu do cabeçalho",exact:true}).click();
 await page.getByLabel("Formato do menu importado",{exact:true}).selectOption("burger");
 await editorFrame.getByRole("heading",{name:plan.name,exact:true}).click();
 await page.getByLabel("Texto do elemento",{exact:true}).fill("Minha marca editada");
 await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(page.getByRole("status")).toContainText("Rascunho salvo");
 const before=await page.request.get(`/p/${slug}/clone`);expect(await before.text()).toContain(plan.name);
 await page.reload();await expect(page.frameLocator('iframe[title="Editor do layout importado"]').getByRole("heading",{name:"Minha marca editada",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Menu do cabeçalho",exact:true}).click();await expect(page.getByLabel("Formato do menu importado",{exact:true})).toHaveValue("burger");
 await page.getByRole("button",{name:"Publicar layout",exact:true}).click();await expect(page.getByRole("status")).toContainText("Layout publicado");
 const after=await page.request.get(`/p/${slug}/clone`);expect(await after.text()).toContain("Minha marca editada");expect(after.headers()["x-frame-options"]).toBe("SAMEORIGIN");
 await page.goto(`/p/${slug}`);await expect(page.frameLocator('iframe[title="'+plan.name+'"]').getByRole("heading",{name:"Minha marca editada",exact:true})).toBeVisible();
 await page.frameLocator('iframe[title="'+plan.name+'"]').getByRole("button",{name:"☰ Menu",exact:true}).click();
 await expect(page.frameLocator('iframe[title="'+plan.name+'"]').locator("nav")).toBeVisible();
 const publicFrame=page.frameLocator('iframe[title="'+plan.name+'"]');await expect(publicFrame.getByRole("link",{name:"Quem somos local",exact:true})).toHaveAttribute("href",`/p/${slug}/original/quem-somos`);
 await publicFrame.getByRole("link",{name:"Quem somos local",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/p/${slug}/original/quem-somos`));await expect(page.frameLocator('iframe[title="'+plan.name+'"]').getByRole("heading",{name:"Quem somos importado",exact:true})).toBeVisible();
 const response=await page.request.get(`/api/portals/${portal.data.id}/clone?path=source:%2Fquem-somos`);expect((await response.json()).draft.html).toContain("Quem somos importado");
 await page.goto(`/painel/${portal.data.id}/homepage`);
 await page.screenshot({path:"/tmp/influente-clone-editor.png"});
 const demos=await client.from("campaigns").select("id").eq("portal_id",portal.data.id);expect(demos.data).toHaveLength(0);
});
