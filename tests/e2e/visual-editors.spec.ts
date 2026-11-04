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

let editorUserId = "";
test.afterAll(async () => {
  if (!editorUserId) {
    const listed = await client.auth.admin.listUsers();
    editorUserId =
      listed.data.users.find((u) => u.email === `editor-${suffix}@example.test`)
        ?.id || "";
  }
  if (editorUserId) await client.auth.admin.deleteUser(editorUserId);
});
test("Tema Diário, editor visual e acesso sem senha isolado por portal", async ({
  page,
  browser,
}) => {
  const created = await client
    .from("portals")
    .insert([
      {
        organization_id: organizationId,
        name: "Jornal Visual",
        slug,
        template: "daily",
        settings: { color: "#c4170c" },
      },
      {
        organization_id: organizationId,
        name: "Outro privado",
        slug: slug + "-outro",
        template: "classic",
        settings: {},
      },
    ])
    .select("id,slug");
  if (created.error) throw created.error;
  const portalId = created.data.find((p) => p.slug === slug)!.id,
    otherId = created.data.find((p) => p.slug !== slug)!.id;
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto(`/painel/${portalId}/equipe`);
  const editorEmail = `editor-${suffix}@example.test`;
  await page.getByLabel("E-mail do editor").fill(editorEmail);
  await page
    .getByRole("button", { name: "Confirmar e enviar convite" })
    .click();
  await expect(page.getByText(editorEmail, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Copiar convite", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toContainText(
    /Convite copiado|Copie o link/,
  );
  const users = await client.auth.admin.listUsers();
  editorUserId = users.data.users.find((u) => u.email === editorEmail)!.id;
  const link = await client.auth.admin.generateLink({
    type: "magiclink",
    email: editorEmail,
  });
  if (link.error) throw link.error;
  const context = await browser.newContext();
  const editor = await context.newPage();
  await editor.goto(
    `/auth/callback?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=magiclink&next=/painel/${portalId}`,
  );
  await editor.getByRole("button", {name:"Confirmar e entrar no portal"}).click();
  await expect(editor).toHaveURL(new RegExp(`/painel/${portalId}$`));
  await expect(editor.locator("#portal-select option")).toHaveCount(2);
  await expect(
    editor.getByRole("link", { name: "Equipe", exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("link", { name: "Criar com IA", exact: true }),
  ).toHaveCount(0);
  const other = await editor.goto(`/painel/${otherId}`);
  expect(other?.status()).toBe(404);
  await editor.goto(`/painel/${portalId}/homepage`);
  await editor.getByLabel("Cor principal", { exact: true }).fill("#9d1717");
  await editor.getByLabel("Tema do editor visual").selectOption("daily");
  await editor.getByRole("button", { name: "+ Vídeo", exact: true }).click();
  await editor
    .locator(".builder-block")
    .last()
    .getByLabel("Link do vídeo")
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const transfer = await editor.evaluateHandle(() => new DataTransfer());
  await editor
    .getByRole("button", { name: "+ Texto", exact: true })
    .dispatchEvent("dragstart", { dataTransfer: transfer });
  await editor
    .locator(".canvas-section")
    .first()
    .dispatchEvent("drop", { dataTransfer: transfer });
  await editor
    .locator(".builder-block")
    .first()
    .getByLabel("Título da seção")
    .fill("Primeiro bloco arrastado");
  await editor
    .locator(".builder-block")
    .first()
    .getByLabel("Texto da seção")
    .fill("Composição visual editada pelo editor convidado.");
  const bytes = await sharp({
    create: { width: 640, height: 320, channels: 3, background: "#9d1717" },
  })
    .png()
    .toBuffer();
  await editor.evaluate(
    ({ bytes }) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File([new Uint8Array(bytes)], "visual.png", { type: "image/png" }),
      );
      document
        .querySelector(".canvas-drop-end")!
        .dispatchEvent(
          new DragEvent("drop", { bubbles: true, dataTransfer: dt }),
        );
    },
    { bytes: [...bytes] },
  );
  await expect(
    editor.locator(".builder-block").last().locator(".media-thumb"),
  ).toBeVisible();
  const media = await client
    .from("media")
    .select("url")
    .eq("portal_id", portalId);
  expect(media.data?.length).toBeGreaterThan(0);
  await editor.getByRole("button", { name: "+ Banner", exact: true }).click();
  const ad = editor.locator(".builder-block").last();
  await ad.getByLabel("Formato do anúncio").selectOption("rectangle");
  await ad.getByLabel("Imagem", { exact: true }).fill(media.data![0].url);
  await ad
    .getByLabel("Link", { exact: true })
    .fill("https://example.com/campanha");
  await editor
    .getByRole("button", { name: "Publicar homepage", exact: true })
    .click();
  await expect(
    editor.getByText("Homepage publicada.", { exact: true }),
  ).toBeVisible();
  const saved = await client
    .from("portals")
    .select("home_published,settings,template")
    .eq("id", portalId)
    .single();
  expect(saved.data?.template).toBe("daily");
  expect(saved.data?.settings.color).toBe("#9d1717");
  expect(saved.data?.home_published.some((s: any) => s.type === "video")).toBe(
    true,
  );
  await editor.goto("/p/" + slug);
  await expect(editor.locator(".news-site.daily")).toBeVisible();
  await expect(
    editor.getByRole("heading", { name: "Primeiro bloco arrastado" }),
  ).toBeVisible();
  await expect(
    editor.locator('iframe[src*="youtube-nocookie.com"]'),
  ).toBeVisible();
  await expect(editor.locator(".ad-format-rectangle img")).toBeVisible();
  await editor.goto(`/painel/${portalId}/dominios`);
  await expect(editor.locator("body")).not.toContainText(
    /Supabase|Vercel|migrations|TOKEN|NEXT_PUBLIC/,
  );
  await editor
    .getByLabel("Domínio", { exact: true })
    .fill(`pending-${suffix}.example.com`);
  await editor
    .getByRole("button", { name: "Conectar domínio", exact: true })
    .click();
  await expect(
    editor.getByRole("heading", { name: `pending-${suffix}.example.com` }),
  ).toBeVisible();
  await page.goto(`/painel/${portalId}/equipe`);
  await page.getByRole("button", { name: "Remover acesso" }).click();
  await expect(
    page.getByText("Editor removido.", { exact: true }),
  ).toBeVisible();
  await editor.goto(`/painel/${portalId}`);
  await expect(editor).toHaveURL(/\/login/);
  await context.close();
});
