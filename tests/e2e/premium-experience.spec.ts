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

test("Experiência compartilhada: submenus, formulário compacto, rodapé, campanhas por página e três temas", async ({
  page,
}) => {
  const first = await client
    .from("portals")
    .insert({
      organization_id: organizationId,
      name: "Portal Premium",
      slug,
      template: "daily",
      settings: {
        color: "#23533e",
        accentColor: "#e2eea4",
        contactEnabled: true,
        newsletterEnabled: false,
      },
    })
    .select("id")
    .single();
  if (first.error) throw first.error;
  const id = first.data.id;
  const sectionId = randomUUID(),
    otherSection = randomUUID();
  const blocks = [
    {
      id: sectionId,
      type: "text",
      title: "Manifesto editorial",
      text: "Informação, boas ideias e conexões que fazem a diferença.",
      backgroundColor: "#ffffff",
    },
    { id: otherSection, type: "latest", title: "Últimas histórias" },
  ];
  await client
    .from("portals")
    .update({ home_draft: blocks, home_published: blocks })
    .eq("id", id);
  await client
    .from("categories")
    .insert({
      organization_id: organizationId,
      portal_id: id,
      name: "Economia",
      slug: "economia",
    });
  await client
    .from("pages")
    .insert({
      organization_id: organizationId,
      portal_id: id,
      title: "Sobre a publicação",
      slug: "sobre",
      content: "<p>Conheça a nossa publicação.</p>",
      published: true,
    });
  await client
    .from("articles")
    .insert(
      ["materia-a", "materia-b"].map((v, i) => ({
        organization_id: organizationId,
        portal_id: id,
        title: `História ${i + 1} para o nosso futuro`,
        slug: v,
        status: "published",
        publish_at: new Date().toISOString(),
        subtitle: "Uma publicação editorial para validar o novo visual.",
        content:
          "<p>Primeira parte do conteúdo editorial.</p><p>Segunda parte da história.</p><p>Terceira parte com contexto adicional.</p><p>Quarta parte e encerramento da notícia.</p>",
      })),
    );
  const bytes = await sharp({
    create: { width: 900, height: 480, channels: 3, background: "#dbe8dc" },
  })
    .webp()
    .toBuffer();
  const path = `${organizationId}/${id}/${randomUUID()}.webp`;
  const file = await client.storage
    .from("portal-media")
    .upload(path, bytes, { contentType: "image/webp" });
  if (file.error) throw file.error;
  const image = client.storage.from("portal-media").getPublicUrl(path)
    .data.publicUrl;
  await client
    .from("media")
    .insert({
      organization_id: organizationId,
      portal_id: id,
      name: "Marca premium",
      url: image,
      path,
      size: bytes.length,
    });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto(`/painel/${id}/aparencia`);
  await page
    .getByLabel("Formato do menu", { exact: true })
    .selectOption("hybrid");
  await page.getByLabel("Posição da marca").selectOption("center");
  const menu = page
    .locator("section.panel")
    .filter({
      has: page.getByRole("heading", {
        name: "Menu de navegação",
        exact: true,
      }),
    });
  await page
    .getByLabel("Organização do menu", { exact: true })
    .selectOption("custom");
  await menu
    .getByRole("button", { name: "+ Adicionar item ao menu", exact: true })
    .click();
  await menu
    .getByLabel("Nome do item", { exact: true })
    .first()
    .fill("Notícias");
  await menu
    .getByLabel("Destino do item", { exact: true })
    .first()
    .fill("/busca?q=historia");
  await menu.getByRole("button", { name: "+ Submenu", exact: true }).click();
  await menu.getByLabel("Nome do submenu", { exact: true }).fill("Economia");
  await menu
    .getByLabel("Destino do submenu", { exact: true })
    .fill("/categoria/economia");
  await menu
    .getByRole("button", { name: "+ Adicionar item ao menu", exact: true })
    .click();
  await menu.getByLabel("Nome do item", { exact: true }).nth(1).fill("Sobre");
  await menu
    .getByLabel("Destino do item", { exact: true })
    .nth(1)
    .fill("/pagina/sobre");
  await page.getByRole("tab", { name: "Formulário", exact: true }).click();
  await page.getByLabel("Formato do formulário").selectOption("compact");
  await page.getByLabel("Largura máxima do formulário").fill("420");
  await page.getByLabel("Distribuição dos campos").selectOption("one");
  await page.getByLabel("Assunto", { exact: true }).uncheck();
  await page.getByLabel("Texto do botão de envio").fill("Falar com a equipe");
  await page.getByRole("tab", { name: "Rodapé", exact: true }).click();
  await page.getByLabel("Fundo do rodapé", { exact: true }).fill("#10231b");
  await page
    .getByLabel("Imagem de anúncio do rodapé", { exact: true })
    .fill(image);
  await page
    .getByLabel("Destino do anúncio do rodapé", { exact: true })
    .fill("https://example.com/anuncie");
  await page
    .getByLabel("Chamada para anunciantes", { exact: true })
    .fill("Sua marca pode estar aqui");
  await page
    .getByLabel("Texto de direitos e créditos")
    .fill("Conteúdo independente e conexões de verdade.");
  await page.getByRole("tab", { name: "Parceiros", exact: true }).click();
  await page
    .getByLabel("Título dos parceiros", { exact: true })
    .fill("Conexões que transformam");
  await page.getByLabel("Marcas por linha no computador").fill("3");
  await page
    .getByRole("button", { name: "Salvar personalização", exact: true })
    .click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/painel/${id}/homepage`);
  await page
    .locator(".canvas-section")
    .first()
    .getByRole("heading", { name: "Manifesto editorial", exact: true })
    .click();
  const inspector = page.locator(".builder-block").first();
  await expect(inspector).toHaveClass(/is-inspecting/);
  await inspector
    .getByLabel("Fundo só do título", { exact: true })
    .fill("#fdf0be");
  await inspector.getByLabel("Cor da copy", { exact: true }).fill("#385c45");
  await page
    .getByRole("button", { name: "Publicar homepage", exact: true })
    .click();
  await expect(
    page.getByText("Homepage publicada.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/painel/${id}/publicidade`);
  await page
    .getByLabel("Nome", { exact: true })
    .fill("Vídeo apenas na matéria A");
  await page.getByLabel("Tipo de conteúdo").selectOption("video");
  await page
    .getByLabel("Link do vídeo", { exact: true })
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page
    .getByLabel("Link", { exact: true })
    .fill("https://example.com/campanha");
  await page
    .getByLabel("Posição", { exact: true })
    .selectOption("article-middle");
  await page
    .locator("summary")
    .filter({ hasText: "Páginas e seções de exibição" })
    .click();
  await page.getByLabel("Notícias", { exact: true }).check();
  await page
    .getByLabel("Páginas específicas", { exact: true })
    .selectOption("/noticia/materia-a");
  await page
    .getByRole("button", { name: "Salvar campanha", exact: true })
    .click();
  await expect(
    page.getByText("Campanha salva.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Marca no manifesto");
  await page.getByLabel("Imagem", { exact: true }).fill(image);
  await page
    .getByLabel("Link", { exact: true })
    .fill("https://example.com/marca");
  await page
    .locator("summary")
    .filter({ hasText: "Páginas e seções de exibição" })
    .click();
  await page
    .getByLabel("Seções específicas", { exact: true })
    .selectOption(sectionId);
  await page.getByLabel("Página inicial", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar campanha", exact: true })
    .click();
  await expect(
    page.getByText("Campanha salva.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/painel/${id}/parceiros`);
  await page.getByLabel("Nome", { exact: true }).fill("Projeto parceiro");
  await page.getByLabel("Tipo de conteúdo").selectOption("video");
  await page
    .getByLabel("Link do vídeo", { exact: true })
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page
    .getByLabel("Link", { exact: true })
    .fill("https://example.com/parceiro");
  await page
    .getByLabel("Apresentação", { exact: true })
    .fill("Uma parceria com espaço para contar sua história.");
  await page
    .getByRole("button", { name: "Salvar parceiro", exact: true })
    .click();
  await expect(
    page.getByText("Parceiro salvo.", { exact: true }),
  ).toBeVisible();
  const saved = await client
    .from("portals")
    .select("settings,home_published")
    .eq("id", id)
    .single();
  expect(saved.data?.home_published[0].backgroundColor).toBe("#ffffff");
  expect(saved.data?.home_published[0].titleBackground).toBe("#fdf0be");
  expect(saved.data?.settings.experience.contact.maxWidth).toBe(420);
  const campaigns = await client
    .from("campaigns")
    .select("id,name,creative")
    .eq("portal_id", id);
  const videoAd = campaigns.data!.find(
      (c) => c.name === "Vídeo apenas na matéria A",
    )!.id,
    sectionAd = campaigns.data!.find(
      (c) => c.name === "Marca no manifesto",
    )!.id;
  for (const theme of ["classic", "modern", "daily"]) {
    await client.from("portals").update({ template: theme }).eq("id", id);
    await page.goto(`/p/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".news-site")).toHaveClass(new RegExp(theme));
    await expect(
      page.getByRole("heading", { name: "Manifesto editorial", exact: true }),
    ).toHaveCSS("background-color", "rgb(253, 240, 190)");
    await expect(
      page.locator(`.visual-section:has(h2:text-is("Manifesto editorial"))`),
    ).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(
      page.locator(`[data-campaign-id="${sectionAd}"]`),
    ).toBeVisible();
    await expect(page.locator(`[data-campaign-id="${videoAd}"]`)).toHaveCount(
      0,
    );
    await expect(page.locator(".reader-contact")).toHaveCSS(
      "max-width",
      "420px",
    );
    await expect(
      page.locator('.reader-contact input[name="name"]'),
    ).not.toBeVisible();
    await expect(page.locator(".footer-advert-image")).toHaveAttribute(
      "href",
      "https://example.com/anuncie",
    );
    await expect(
      page.getByRole("heading", {
        name: "Conexões que transformam",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".partner-visual iframe")).toBeVisible();
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Menu do portal" });
    await expect(drawer).toBeVisible();
    await drawer.locator("summary").filter({ hasText: "Notícias" }).click();
    await expect(
      drawer.getByRole("link", { name: "Economia", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  }
  await page.goto(`/p/${slug}/noticia/materia-a`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator(`.public-article [data-campaign-id="${videoAd}"] iframe`),
  ).toBeVisible();
  await page.goto(`/p/${slug}/noticia/materia-b`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(`[data-campaign-id="${videoAd}"]`)).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto(`/p/${slug}`, { waitUntil: "domcontentloaded" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(await page.locator('.news-footer .footer-columns').evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThan(300);
  await page.screenshot({
    path: "/tmp/influente-premium-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/painel/${id}/publicidade`);
  await page.screenshot({
    path: "/tmp/influente-commercial-desktop.png",
    fullPage: true,
  });
});
