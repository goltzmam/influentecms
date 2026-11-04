import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { confirmationLink } from "../../src/lib/access-link";
let admin: SupabaseClient, org: string, portal: string;
const users: string[] = [];
const suffix = randomUUID().slice(0, 8);
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("Local only");
  admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const o = await admin
    .from("organizations")
    .insert({ name: "Invite check " + suffix })
    .select("id")
    .single();
  if (o.error) throw o.error;
  org = o.data.id;
  const p = await admin
    .from("portals")
    .insert({
      organization_id: org,
      name: "Convites",
      slug: "convites-" + suffix,
      template: "classic",
      settings: {},
    })
    .select("id")
    .single();
  if (p.error) throw p.error;
  portal = p.data.id;
});
test.afterAll(async () => {
  if (org) await admin.from("organizations").delete().eq("id", org);
  for (const id of users) await admin.auth.admin.deleteUser(id);
});
async function invite(kind: "invite" | "magiclink") {
  const email = `access-${kind}-${suffix}@example.test`;
  if (kind === "magiclink") {
    const u = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (u.error) throw u.error;
    users.push(u.data.user.id);
  }
  const row = await admin
    .from("portal_editors")
    .insert({ organization_id: org, portal_id: portal, email });
  if (row.error) throw row.error;
  const link = await admin.auth.admin.generateLink({
    type: kind,
    email,
    options: {
      redirectTo: `http://127.0.0.1:3100/auth/callback?next=/painel/${portal}`,
    },
  });
  if (link.error) throw link.error;
  if (kind === "invite") users.push(link.data.user.id);
  return link.data;
}
test("Convite não é consumido por visita automática, confirma no navegador novo e rejeita reutilização", async ({
  browser,
}) => {
  const link = await invite("invite");
  const url = confirmationLink(
    "http://127.0.0.1:3100",
    link.properties.hashed_token,
    "invite",
    `/painel/${portal}`,
  );
  const scanner = await browser.newContext();
  const s = await scanner.newPage();
  let attempts = 0;
  s.on("request", (r) => {
    if (r.url().endsWith("/api/auth/confirm")) attempts++;
  });
  await s.goto(url);
  await expect(
    s.getByRole("button", { name: "Confirmar e entrar no portal" }),
  ).toBeVisible();
  expect(attempts).toBe(0);
  expect(s.url()).not.toContain("token_hash");
  await scanner.close();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page
    .getByRole("button", { name: "Confirmar e entrar no portal" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/painel/${portal}$`));
  await expect(
    page.getByRole("link", { name: "Equipe", exact: true }),
  ).toHaveCount(0);
  await context.close();
  const reused = await browser.newContext();
  const p = await reused.newPage();
  await p.goto(url);
  await p.getByRole("button", { name: "Confirmar e entrar no portal" }).click();
  await expect(p.locator("main p[role=alert]")).toContainText(/expirou|usado/);
  await reused.close();
});
test("Link antigo com tokens na URL entra com cookies válidos, sem erro de PKCE", async ({
  browser,
}) => {
  const link = await invite("magiclink");
  const response = await fetch(link.properties.action_link, {
    redirect: "manual",
  });
  const location = response.headers.get("location");
  if (!location?.includes("access_token="))
    throw new Error("Legacy redirect unavailable");
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(location);
  await expect(
    page.getByRole("button", { name: "Confirmar e entrar no portal" }),
  ).toBeVisible();
  expect(page.url()).not.toContain("access_token");
  await page
    .getByRole("button", { name: "Confirmar e entrar no portal" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/painel/${portal}$`));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/painel/${portal}$`));
  await context.close();
});
