import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
let admin: SupabaseClient,
  org: string,
  user: string,
  editor: string,
  portal: string,
  other: string,
  email: string,
  password: string,
  file: string;
const suffix = randomUUID().slice(0, 8),
  name = "Portal " + suffix,
  slug = "premium-" + suffix;
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("Local only");
  admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  email = `premium-${suffix}@example.test`;
  password = randomBytes(24).toString("base64url");
  const u = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (u.error) throw u.error;
  user = u.data.user.id;
  const o = await admin
    .from("organizations")
    .insert({ name: "Premium isolated " + suffix })
    .select("id")
    .single();
  if (o.error) throw o.error;
  org = o.data.id;
  await admin
    .from("organization_members")
    .insert({ organization_id: org, user_id: user });
  const p = await admin
    .from("portals")
    .insert([
      { organization_id: org, name, slug, template: "classic" },
      {
        organization_id: org,
        name: "Outro portal preservado",
        slug: "preservado-" + suffix,
        template: "daily",
      },
    ])
    .select("id,slug");
  if (p.error) throw p.error;
  portal = p.data.find((p) => p.slug === slug)!.id;
  other = p.data.find((p) => p.slug !== slug)!.id;
  await admin
    .from("domains")
    .insert({
      organization_id: org,
      portal_id: portal,
      hostname: `reserved-${suffix}.vercel.app`,
    });
  file = `${org}/${portal}/proof.webp`;
  const bytes = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#e3edda" },
  })
    .webp()
    .toBuffer();
  const stored = await admin.storage
    .from("portal-media")
    .upload(file, bytes, { contentType: "image/webp" });
  if (stored.error) throw stored.error;
  await admin.from("media").insert({
    organization_id: org,
    portal_id: portal,
    name: "Proof",
    path: file,
    url: admin.storage.from("portal-media").getPublicUrl(file).data.publicUrl,
    size: bytes.length,
  });
  await admin.from("articles").insert({
    organization_id: org,
    portal_id: portal,
    title: "Notícia para testar exclusão",
    slug: "teste",
    status: "published",
    publish_at: new Date().toISOString(),
  });
  const e = await admin.auth.admin.createUser({
    email: `editor-premium-${suffix}@example.test`,
    password,
    email_confirm: true,
  });
  if (e.error) throw e.error;
  editor = e.data.user.id;
  await admin.from("portal_editors").insert({
    organization_id: org,
    portal_id: portal,
    user_id: editor,
    email: `editor-premium-${suffix}@example.test`,
  });
});
test.afterAll(async () => {
  if (file) await admin.storage.from("portal-media").remove([file]);
  if (org) await admin.from("organizations").delete().eq("id", org);
  for (const id of [user, editor])
    if (id) await admin.auth.admin.deleteUser(id);
});
test("Painel premium responsivo, confirmação de exclusão, isolamento e limpeza de arquivos", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".workspace-hero")).toBeVisible();
  await page.screenshot({
    path: "/tmp/influente-admin-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: `Excluir portal ${name}`, exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "Excluir definitivamente" }),
  ).toBeDisabled();
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await expect(modal).not.toBeVisible();
  expect(
    (await admin.from("portals").select("id").eq("id", portal)).data,
  ).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Configurações gerais", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  for (const section of [
    "",
    "noticias",
    "categorias",
    "homepage",
    "aparencia",
    "midia",
    "publicidade",
    "parceiros",
    "metricas",
    "paginas",
    "dominios",
    "equipe",
    "leitores",
    "configuracoes",
  ]) {
    const response = await page.goto(
      `/painel/${portal}${section ? "/" + section : ""}`,
    );
    expect(response?.status(), section).toBe(200);
    await expect(page.locator(".content h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
      section + " overflow",
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/influente-admin-mobile.png",
    fullPage: true,
  });
  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  await editorPage.goto("http://127.0.0.1:3100/login");
  await editorPage
    .getByLabel("E-mail", { exact: true })
    .fill(`editor-premium-${suffix}@example.test`);
  await editorPage.getByLabel("Senha", { exact: true }).fill(password);
  await editorPage.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(editorPage).toHaveURL(new RegExp("/painel/" + portal));
  await expect(
    editorPage.getByRole("button", { name: /Excluir portal/ }),
  ).toHaveCount(0);
  const forbidden = await editorPage.goto(
    `http://127.0.0.1:3100/painel/${portal}/configuracoes`,
  );
  expect(forbidden?.status()).toBe(404);
  await editorContext.close();
  await page
    .getByRole("button", { name: `Excluir portal ${name}`, exact: true })
    .click();
  await modal.getByRole("textbox").fill("Outro nome");
  await expect(
    modal.getByRole("button", { name: "Excluir definitivamente" }),
  ).toBeDisabled();
  await modal
    .getByRole("button", { name: "Excluir definitivamente" })
    .evaluate((el) => ((el as HTMLButtonElement).disabled = false));
  await modal.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(modal.getByRole("alert")).toContainText("não corresponde");
  expect(
    (await admin.from("portals").select("id").eq("id", portal)).data,
  ).toHaveLength(1);
  await modal.getByRole("textbox").fill(name);
  await modal.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(page).toHaveURL(/\/painel\?notice=/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Portal excluído com sucesso." }),
  ).toBeVisible();
  expect(
    (await admin.from("portals").select("id").eq("id", portal)).data,
  ).toHaveLength(0);
  expect(
    (await admin.from("portals").select("id").eq("id", other)).data,
  ).toHaveLength(1);
  expect(
    (await admin.from("articles").select("id").eq("portal_id", portal)).data,
  ).toHaveLength(0);
  expect(
    (await admin.from("portal_editors").select("id").eq("portal_id", portal))
      .data,
  ).toHaveLength(0);
  expect(
    (await admin.storage.from("portal-media").list(`${org}/${portal}`)).data,
  ).toHaveLength(0);
  expect((await page.request.get("/p/" + slug)).status()).toBe(404);
});
