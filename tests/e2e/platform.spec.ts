import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
let client: SupabaseClient,
  organizationId: string,
  userId: string,
  email: string,
  password: string;
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
test("Fluxo real: autenticar, criar, publicar, personalizar, anunciar e renderizar os dois templates", async ({
  page,
  request,
}) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole("link", { name: "Criar portal", exact: true }).click();
  await page.getByLabel("Nome do portal").fill(`Jornal ${suffix}`);
  await page.getByLabel("Endereço provisório").fill(slug);
  await page.getByRole("button", { name: "Criar portal →" }).click();
  await expect(page).toHaveURL(/\/painel\/[a-f0-9-]+\?notice=/);
  const portalId = new URL(page.url()).pathname.split("/")[2];
  await page.goto(`/painel/${portalId}/categorias`);
  await page.getByLabel("Nome", { exact: true }).fill("Política");
  await page.getByLabel("URL amigável").fill("politica");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(
    page.getByText("Categoria criada.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/noticias/nova`);
  await page
    .getByLabel("Título", { exact: true })
    .fill("Uma notícia de integração");
  await page.getByLabel("URL amigável").fill("noticia-integracao");
  await page
    .getByLabel("Subtítulo")
    .fill("Publicação de teste automatizado que será removida ao final.");
  await page
    .locator(".tiptap")
    .fill("Conteúdo real persistido pelo editor TipTap no Supabase local.");
  await page.getByLabel("Autor", { exact: true }).fill("Redação");
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: "Política" });
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  const image = await sharp({
    create: { width: 800, height: 450, channels: 3, background: "#285c45" },
  })
    .png()
    .toBuffer();
  await page
    .locator("aside .media-input input[type=file]")
    .setInputFiles({ name: "capa.png", mimeType: "image/png", buffer: image });
  await expect(page.locator("aside input[name=cover_url]")).not.toHaveValue(
    "",
    { timeout: 20000 },
  );
  await page.getByLabel("Descrição da imagem").fill("Capa de teste");
  await page.getByRole("button", { name: "Salvar notícia" }).click();
  await expect(page.getByText("Notícia salva.", { exact: true })).toBeVisible();
  const publicPage = await page.context().newPage();
  await publicPage.goto(`/p/${slug}`);
  await expect(
    publicPage
      .locator(".reference-carousel")
      .getByRole("heading", { name: "Uma notícia de integração" }),
  ).toBeVisible();
  await publicPage
    .locator(".reference-carousel")
    .getByRole("link", { name: "Uma notícia de integração", exact: true })
    .click();
  await expect(publicPage.locator(".article-body")).toContainText(
    "Conteúdo real persistido",
  );
  await expect(
    publicPage.locator('script[type="application/ld+json"]'),
  ).toHaveCount(1);
  await publicPage.goto(`/p/${slug}/categoria/politica`);
  await expect(
    publicPage.getByRole("heading", { name: "Uma notícia de integração" }),
  ).toBeVisible();
  await publicPage.goto(`/p/${slug}/busca?q=integração`);
  await expect(
    publicPage.getByRole("heading", { name: "Uma notícia de integração" }),
  ).toBeVisible();
  for (const endpoint of ["sitemap.xml", "news-sitemap.xml", "rss.xml"]) {
    const response = await request.get(`/p/${slug}/${endpoint}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("noticia-integracao");
  }
  const robots = await request.get(`/p/${slug}/robots.txt`);
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");
  await page.goto(`/painel/${portalId}/homepage`);
  await page.getByRole("button", { name: "+ Texto", exact: true }).click();
  await page
    .locator(".builder-block")
    .last()
    .getByLabel("Título da seção")
    .fill("Nossa linha editorial");
  await page
    .locator(".builder-block")
    .last()
    .getByLabel("Texto da seção")
    .fill("Jornalismo de interesse público.");
  await page
    .getByRole("button", { name: "Publicar homepage", exact: true })
    .click();
  await expect(
    page.getByText("Homepage publicada.", { exact: true }),
  ).toBeVisible();
  await publicPage.goto(`/p/${slug}`);
  await expect(
    publicPage.getByText("Jornalismo de interesse público."),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/aparencia`);
  await page.getByLabel("Template", { exact: true }).selectOption("modern");
  await page.getByRole("button", { name: "Salvar personalização" }).click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  await publicPage.goto(`/p/${slug}`);
  await expect(publicPage.locator(".news-site")).toHaveClass(/modern/);
  await expect(
    publicPage.getByText("Jornalismo de interesse público."),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/publicidade`);
  await page.getByLabel("Nome", { exact: true }).fill("Campanha institucional");
  await page.locator("input[type=file]").setInputFiles({
    name: "banner.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.locator("input[name=image_url]")).not.toHaveValue("");
  await page.getByLabel("Link", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "Salvar campanha" }).click();
  await expect(
    page.getByText("Campanha salva.", { exact: true }),
  ).toBeVisible();
  await publicPage.goto(`/p/${slug}`);
  await expect(publicPage.locator(".public-ad img")).toHaveCount(1);
  await page.goto(`/painel/${portalId}/parceiros`);
  await page.getByLabel("Nome", { exact: true }).fill("Parceiro de teste");
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: image });
  await expect(page.locator("input[name=image_url]")).not.toHaveValue("");
  await page.getByLabel("Link", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "Salvar parceiro" }).click();
  await expect(
    page.getByText("Parceiro salvo.", { exact: true }),
  ).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByAltText("Parceiro de teste")).toBeVisible();
  await page.goto(`/painel/${portalId}/paginas/nova`);
  await page.getByLabel("Título", { exact: true }).fill("Sobre o jornal");
  await page.getByLabel("URL amigável").fill("sobre");
  await page.locator(".tiptap").fill("Uma publicação independente.");
  await page.getByLabel("Página publicada").check();
  await page.getByRole("button", { name: "Salvar página" }).click();
  await expect(page.getByText("Página salva.", { exact: true })).toBeVisible();
  await publicPage.goto(`/p/${slug}/pagina/sobre`);
  await expect(
    publicPage.getByText("Uma publicação independente."),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/noticias/nova`);
  await page.getByLabel("Título", { exact: true }).fill("Notícia do futuro");
  await page.getByLabel("URL amigável").fill("noticia-futura");
  await page.getByLabel("Autor", { exact: true }).fill("Redação");
  await page.getByLabel("Status", { exact: true }).selectOption("scheduled");
  await page.getByLabel("Data de publicação (UTC)").fill("2099-01-01T12:00");
  await page.getByRole("button", { name: "Salvar notícia" }).click();
  await expect(page.getByText("Notícia salva.", { exact: true })).toBeVisible();
  const future = await request.get(`/p/${slug}/noticia/noticia-futura`);
  expect(future.status()).toBe(404);
  const scheduled = await client
    .from("articles")
    .select("id,status")
    .eq("portal_id", portalId)
    .eq("slug", "noticia-futura")
    .single();
  expect(scheduled.error).toBeNull();
  expect(scheduled.data?.status).toBe("scheduled");
  await page.goto(`/painel/${portalId}/preview/noticia/${scheduled.data!.id}`);
  await expect(
    page.getByRole("heading", { name: "Notícia do futuro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("PRÉ-VISUALIZAÇÃO PRIVADA · Conteúdo não publicado"),
  ).toBeVisible();
  const anonymousPreview = await request.get(
    `/painel/${portalId}/preview/noticia/${scheduled.data!.id}`,
  );
  expect(new URL(anonymousPreview.url()).pathname).toBe("/login");
  const original = await client
    .from("articles")
    .select("id,publish_at")
    .eq("portal_id", portalId)
    .eq("slug", "noticia-integracao")
    .single();
  expect(original.error).toBeNull();
  await page.goto(`/painel/${portalId}/noticias/${original.data!.id}`);
  await page
    .getByLabel("Título", { exact: true })
    .fill("Notícia revisada de integração");
  await page.getByRole("button", { name: "Salvar notícia" }).click();
  await expect(page.getByText("Notícia salva.", { exact: true })).toBeVisible();
  await publicPage.goto(`/p/${slug}/noticia/noticia-integracao`);
  await expect(
    publicPage.getByRole("heading", {
      name: "Notícia revisada de integração",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/publicidade`);
  await page.getByRole("button", { name: /Campanha institucional/ }).click();
  const campaignForm = page.locator("form.panel").filter({
    has: page.getByRole("heading", { name: "Editar campanha", exact: true }),
  });
  await campaignForm.getByLabel("Campanha ativa").uncheck();
  await campaignForm.getByRole("button", { name: "Salvar campanha" }).click();
  await expect(
    page.getByText("Campanha salva.", { exact: true }),
  ).toBeVisible();
  await publicPage.goto(`/p/${slug}`);
  await expect(publicPage.locator(".public-ad img")).toHaveCount(0);
  await page.goto(`/painel/${portalId}/noticias`);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row")
    .filter({ hasText: "Notícia revisada de integração" })
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(
    page.getByText("Registro excluído.", { exact: true }),
  ).toBeVisible();
  expect(
    (await request.get(`/p/${slug}/noticia/noticia-integracao`)).status(),
  ).toBe(404);
  const mobile = await page.context().newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`/p/${slug}`);
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mobile.close();
  await page.goto(`/painel/${portalId}`);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(`/painel/${portalId}`);
  await expect(page).toHaveURL(/\/login/);
  await publicPage.close();
});
