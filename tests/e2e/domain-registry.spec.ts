import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
let admin: SupabaseClient,
  org: string,
  user: string,
  p1: string,
  p2: string,
  d1: string,
  d2: string,
  email: string,
  password: string;
const suffix = randomUUID().slice(0, 8),
  host = `dominio-${suffix}.example.test`,
  second = `novo-${suffix}.example.test`,
  slug1 = "primeiro-" + suffix,
  slug2 = "segundo-" + suffix;
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("Local only");
  admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  email = `domains-${suffix}@example.test`;
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
    .insert({ name: "Domain isolated " + suffix })
    .select("id")
    .single();
  if (o.error) throw o.error;
  org = o.data.id;
  await admin
    .from("organization_members")
    .insert({ organization_id: org, user_id: user });
  const portals = await admin
    .from("portals")
    .insert([
      { organization_id: org, name: "Primeiro portal", slug: slug1 },
      { organization_id: org, name: "Segundo portal", slug: slug2 },
    ])
    .select("id,slug");
  if (portals.error) throw portals.error;
  p1 = portals.data.find((p) => p.slug === slug1)!.id;
  p2 = portals.data.find((p) => p.slug === slug2)!.id;
  const domains = await admin
    .from("domains")
    .insert([
      { organization_id: org, portal_id: null, hostname: host, verified: true },
      {
        organization_id: org,
        portal_id: null,
        hostname: second,
        verified: true,
      },
    ])
    .select("id,hostname");
  if (domains.error) throw domains.error;
  d1 = domains.data.find((d) => d.hostname === host)!.id;
  d2 = domains.data.find((d) => d.hostname === second)!.id;
});
test.afterAll(async () => {
  if (org) await admin.from("organizations").delete().eq("id", org);
  if (user) await admin.auth.admin.deleteUser(user);
});
test("Central cadastra, vincula, transfere sem refazer DNS e Ver portal usa o domínio; criação escolhe somente disponíveis", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page
    .getByRole("link", { name: "Central de domínios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Central de domínios", exact: true }),
  ).toBeVisible();
  let card = page
    .locator(".registry-domain-card")
    .filter({ has: page.getByRole("heading", { name: host, exact: true }) });
  await card.getByLabel("Portal vinculado").selectOption(p1);
  await card
    .getByRole("button", { name: "Vincular ao portal", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Vínculo atualizado." }),
  ).toBeVisible();
  await page.goto(`/painel/${p1}`);
  await expect(
    page.getByRole("link", { name: "Ver portal", exact: false }).last(),
  ).toHaveAttribute("href", "https://" + host);
  await expect(
    page.getByRole("link", { name: "Abrir portal", exact: true }).first(),
  ).toHaveAttribute("href", "https://" + host);
  const first = await request.get("/", { headers: { Host: host } });
  expect(first.status()).toBe(200);
  expect(await first.text()).toContain("Primeiro portal");
  await page.goto("/painel/novo");
  const options = page.getByLabel("Domínio para este portal", { exact: true });
  await expect(options.locator(`option[value="${d1}"]`)).toHaveCount(0);
  await expect(options.locator(`option[value="${d2}"]`)).toHaveCount(1);
  await page.getByLabel("Nome do portal").fill("Criado com domínio");
  await page.getByLabel("Endereço provisório").fill("criado-" + suffix);
  await options.selectOption(d2);
  await page
    .getByRole("button", { name: "Criar portal →", exact: true })
    .click();
  await expect(page).toHaveURL(/\/painel\/[0-9a-f-]+\?notice=/);
  const created = await admin
    .from("portals")
    .select("id")
    .eq("slug", "criado-" + suffix)
    .single();
  expect(
    (await admin.from("domains").select("portal_id").eq("id", d2).single()).data
      ?.portal_id,
  ).toBe(created.data?.id);
  await expect(
    page.getByRole("link", { name: "Ver portal", exact: false }).last(),
  ).toHaveAttribute("href", "https://" + second);
  await page.goto("/painel/dominios");
  card = page
    .locator(".registry-domain-card")
    .filter({ has: page.getByRole("heading", { name: host, exact: true }) });
  await card.getByLabel("Portal vinculado").selectOption(p2);
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Vínculo atualizado." }),
  ).toBeVisible();
  const transferred = await request.get("/", { headers: { Host: host } });
  expect(transferred.status()).toBe(200);
  expect(await transferred.text()).toContain("Segundo portal");
  await page.goto(`/painel/${p1}`);
  await expect(
    page.getByRole("link", { name: "Ver portal", exact: false }).last(),
  ).toHaveAttribute("href", "/p/" + slug1);
  await page.goto("/painel/dominios");
  card = page
    .locator(".registry-domain-card")
    .filter({ has: page.getByRole("heading", { name: host, exact: true }) });
  await card
    .getByRole("button", { name: "Desvincular e disponibilizar", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /Domínio desvinculado/ }),
  ).toBeVisible();
  expect((await request.get("/", { headers: { Host: host } })).status()).toBe(
    404,
  );
  expect(
    (
      await admin
        .from("domains")
        .select("verified,portal_id")
        .eq("id", d1)
        .single()
    ).data,
  ).toMatchObject({ verified: true, portal_id: null });
  await page
    .getByLabel("Seu domínio", { exact: true })
    .fill("pendente-" + suffix + ".example.test");
  await page
    .getByRole("button", { name: "Cadastrar domínio", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Domínio salvo/ })
      .first(),
  ).toBeVisible();
  const pending = await admin
    .from("domains")
    .select("portal_id,verified")
    .eq("hostname", "pendente-" + suffix + ".example.test")
    .single();
  expect(pending.data).toMatchObject({ portal_id: null, verified: false });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/influente-domain-central.png",
    fullPage: true,
  });
});
