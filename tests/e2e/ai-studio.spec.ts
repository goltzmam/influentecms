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

test("Estúdio IA recupera plano, pré-visualiza e cria portal editável real", async ({
  page,
  request,
}) => {
  const fixture = await import("../fixtures/ai-blueprint.mjs");
  const plan = structuredClone(fixture.blueprint);
  plan.slug = slug;
  const owner = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const login = await owner.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const started = await owner.rpc("start_portal_ai_job", {
    p_organization: organizationId,
    p_brief: "Crie um portal fitness chamado SaudeFIT.",
    p_references: [],
  });
  if (started.error) throw started.error;
  const finished = await owner.rpc("finish_portal_ai_job", {
    p_job: started.data,
    p_plan: plan,
    p_model: "test-fixture",
    p_references: [],
    p_warnings: [],
    p_failed: false,
  });
  if (finished.error) throw finished.error;
  const failed = await owner.rpc("start_portal_ai_job", {
    p_organization: organizationId,
    p_brief: "Crie um portal que possa ser retomado depois de uma falha.",
    p_references: [],
  });
  if (failed.error) throw failed.error;
  const failedFinish = await owner.rpc("finish_portal_ai_job", {
    p_job: failed.data,
    p_plan: null,
    p_model: null,
    p_references: [],
    p_warnings: ["provider_error"],
    p_failed: true,
  });
  if (failedFinish.error) throw failedFinish.error;
  expect(
    (
      await request.post("/api/ai/portals/generate", {
        data: {},
        headers: { Origin: "http://127.0.0.1:3100" },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole("link", { name: "Criar com IA" }).click();
  await expect(page.getByText("ESTÚDIO FLUE", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Gemini");
  await page.getByRole("button", { name: "Retomar briefing" }).click();
  await expect(page.getByLabel("O que vamos criar?")).toHaveValue(
    "Crie um portal que possa ser retomado depois de uma falha.",
  );
  await page.getByRole("button", { name: "Abrir projeto" }).click();
  await expect(page.getByLabel("Nome do portal")).toHaveValue("SaudeFIT");
  await page.getByLabel("Nome do portal").fill("SaudeFIT Editável");
  await page.getByRole("button", { name: "Pré-visualizar portal" }).click();
  await expect(page.getByRole("dialog")).toContainText("SaudeFIT Editável");
  await page.getByRole("button", { name: "Fechar prévia" }).click();
  await page
    .getByLabel("Domínio para este portal", { exact: true })
    .selectOption(domainId);
  await page.getByRole("button", { name: "Criar portal editável" }).click();
  await expect(page).toHaveURL(/\/painel\/[a-f0-9-]+\?notice=/);
  const portal = await client
    .from("portals")
    .select("id,settings")
    .eq("slug", slug)
    .single();
  if (portal.error) throw portal.error;
  expect(
    (
      await client
        .from("domains")
        .select("portal_id")
        .eq("id", domainId)
        .single()
    ).data?.portal_id,
  ).toBe(portal.data.id);
  expect(portal.data.settings.logo).toContain("/storage/v1/object/public/");
  const articles = await client
    .from("articles")
    .select("status,cover_url")
    .eq("portal_id", portal.data.id);
  expect(articles.data?.[0].status).toBe("published");
  expect(articles.data?.[0].cover_url).toContain("/storage/v1/object/public/");
  const demos = await client
    .from("campaigns")
    .select("id,creative,image_url")
    .eq("portal_id", portal.data.id);
  expect(demos.data).toHaveLength(4);
  expect(demos.data?.every((c) => c.creative.demo && c.image_url)).toBe(true);
  const partners = await client
    .from("partners")
    .select("id,creative,image_url")
    .eq("portal_id", portal.data.id);
  expect(partners.data).toHaveLength(1);
  expect(partners.data?.[0].creative.demo).toBe(true);
  const visuals = await client
    .from("portal_ai_jobs")
    .select("visual_status")
    .eq("id", started.data)
    .single();
  expect(visuals.data?.visual_status).toBe("ready");
  await page.goto(`/painel/${portal.data.id}/midia`);
  await page.getByRole("button", { name: "Atualizar artes de marca" }).click();
  await expect(page.getByText(/artes de marca atualizadas/)).toBeVisible();
  const refreshed = await client
    .from("portals")
    .select("settings")
    .eq("id", portal.data.id)
    .single();
  expect(refreshed.data?.settings.logo).not.toBe(portal.data.settings.logo);
  await page.goto("/p/" + slug);
  await expect(
    page.getByRole("img", { name: "SaudeFIT Editável", exact: true }).first(),
  ).toBeVisible();
  await page.goto("/painel/" + portal.data.id + "/noticias");
  await expect(
    page.getByText(plan.articles[0].title, { exact: true }).first(),
  ).toBeVisible();
});
