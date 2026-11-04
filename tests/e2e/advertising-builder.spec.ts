import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
let admin: SupabaseClient,
  org: string,
  user: string,
  portal: string,
  email: string,
  password: string,
  campaign: string;
const suffix = randomUUID().slice(0, 8),
  slug = "ads-" + suffix;
const lead = randomUUID(),
  sponsored = randomUUID(),
  category = randomUUID(),
  banner = randomUUID();
let path: string;
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("Local only");
  admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  email = `ads-${suffix}@example.test`;
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
    .insert({ name: "Ads " + suffix })
    .select("id")
    .single();
  if (o.error) throw o.error;
  org = o.data.id;
  await admin
    .from("organization_members")
    .insert({ organization_id: org, user_id: user });
  const p = await admin
    .from("portals")
    .insert({
      organization_id: org,
      name: "Influente News",
      slug,
      template: "classic",
      settings: {
        contactEnabled: false,
        newsletterEnabled: false,
        color: "#6324dc",
        accentColor: "#d5ff00",
      },
    })
    .select("id")
    .single();
  if (p.error) throw p.error;
  portal = p.data.id;
  const c = await admin
    .from("categories")
    .insert({
      organization_id: org,
      portal_id: portal,
      name: "Política",
      slug: "politica",
    })
    .select("id")
    .single();
  if (c.error) throw c.error;
  const bytes = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#bba5d4" },
  })
    .webp()
    .toBuffer();
  path = `${org}/${portal}/test.webp`;
  await admin.storage
    .from("portal-media")
    .upload(path, bytes, { contentType: "image/webp" });
  const image = admin.storage.from("portal-media").getPublicUrl(path)
    .data.publicUrl;
  const articles = await admin
    .from("articles")
    .insert(
      Array.from({ length: 12 }, (_, i) => ({
        organization_id: org,
        portal_id: portal,
        title: "História editorial de teste " + i,
        slug: "historia-" + i,
        category_id: c.data.id,
        status: "published",
        publish_at: new Date(Date.now() - 60000 - i * 60000).toISOString(),
        author: "Redação",
        subtitle: "Contexto editorial de teste, removido após a validação.",
        content: "<p>Um.</p><p>Dois.</p><p>Três.</p><p>Quatro.</p>",
        cover_url: image,
      })),
    )
    .select("id");
  if (articles.error) throw articles.error;
  const sections = [
    { id: lead, type: "lead", title: "" },
    {
      id: sponsored,
      type: "sponsored",
      title: "Publieditorial",
      articleIds: [articles.data[7].id],
    },
    {
      id: category,
      type: "category",
      title: "Política",
      categoryId: c.data.id,
      layout: "news",
    },
    { id: banner, type: "banner", title: "", position: "between" },
  ];
  await admin
    .from("portals")
    .update({ home_draft: sections, home_published: sections })
    .eq("id", portal);
  const ad = await admin
    .from("campaigns")
    .insert({
      organization_id: org,
      portal_id: portal,
      name: "Parceiro de teste",
      image_url: image,
      link: "https://example.com/anunciante",
      position: "header",
      active: true,
    })
    .select("id")
    .single();
  if (ad.error) throw ad.error;
  campaign = ad.data.id;
});
test.afterAll(async () => {
  if (path) await admin.storage.from("portal-media").remove([path]);
  if (org) await admin.from("organizations").delete().eq("id", org);
  if (user) await admin.auth.admin.deleteUser(user);
});
test("Editor visual: três papéis, drag and drop, prévia real, persistência e AdSense em todos os temas e notícias", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1100 });
  let scripts = 0;
  await page.route("https://pagead2.googlesyndication.com/**", (route) => {
    scripts++;
    return route.fulfill({
      contentType: "application/javascript",
      body: 'window.adsbygoogle=[];window.adsbygoogle.push=function(){document.querySelectorAll("ins.adsbygoogle").forEach(n=>n.setAttribute("data-adsbygoogle-status","done"));};',
    });
  });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto(`/painel/${portal}/homepage`);
  await page
    .getByRole("button", { name: "Editar em tela cheia", exact: true })
    .click();
  await expect(page.locator(".homepage-editor")).toHaveClass(
    /builder-fullscreen/,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".homepage-editor")).not.toHaveClass(
    /builder-fullscreen/,
  );
  await expect(
    page.locator(".visual-canvas .slot-kind-advertising").first(),
  ).toBeVisible();
  await expect(
    page.locator(".visual-canvas .slot-kind-google").first(),
  ).toBeVisible();
  await expect(
    page.locator(".visual-canvas .slot-kind-sponsor").first(),
  ).toBeVisible();
  expect(scripts).toBe(0);
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page
    .getByRole("button", { name: "Patrocinador", exact: true })
    .dispatchEvent("dragstart", { dataTransfer: transfer });
  await page
    .locator(`.canvas-section[data-section-id="${lead}"] .canvas-ad-targets`)
    .last()
    .locator('[data-ad-zone="heading"]')
    .dispatchEvent("drop", { dataTransfer: transfer });
  let sections = JSON.parse(
    await page.locator("input[name=sections]").inputValue(),
  );
  expect(
    sections
      .find((s: any) => s.id === lead)
      .adSlots.some((a: any) => a.kind === "sponsor" && a.zone === "heading"),
  ).toBe(true);
  const googleId = sections
    .find((s: any) => s.id === lead)
    .adSlots.find((a: any) => a.kind === "google").id;
  const moveSlot = async (target: string, zone: string) => {
    const dt = await page.evaluateHandle(() => new DataTransfer());
    await page
      .locator(`.visual-canvas [data-ad-slot-id="${googleId}"]`)
      .dispatchEvent("dragstart", { dataTransfer: dt });
    await page
      .locator(
        `.canvas-section[data-section-id="${target}"] .canvas-ad-targets`,
      )
      .last()
      .locator(`[data-ad-zone="${zone}"]`)
      .dispatchEvent("drop", { dataTransfer: dt });
  };
  await moveSlot(category, "after");
  let moved = JSON.parse(
    await page.locator("input[name=sections]").inputValue(),
  );
  expect(
    moved
      .find((s: any) => s.id === category)
      .adSlots.some((a: any) => a.id === googleId && a.zone === "after"),
  ).toBe(true);
  await moveSlot(lead, "sidebar");
  const sidebarId = sections
    .find((s: any) => s.id === lead)
    .adSlots.find(
      (a: any) => a.kind === "advertising" && a.zone === "sidebar",
    ).id;
  const reorder = await page.evaluateHandle(() => new DataTransfer());
  await page
    .locator(`.visual-canvas [data-ad-slot-id="${googleId}"]`)
    .dispatchEvent("dragstart", { dataTransfer: reorder });
  await page
    .locator(`.visual-canvas [data-ad-slot-id="${sidebarId}"]`)
    .dispatchEvent("drop", { dataTransfer: reorder });
  const ordered = JSON.parse(
    await page.locator("input[name=sections]").inputValue(),
  );
  expect(
    ordered
      .find((s: any) => s.id === lead)
      .adSlots.filter((a: any) => a.zone === "sidebar")[0].id,
  ).toBe(googleId);

  await page
    .getByRole("button", { name: "Descer seção 3", exact: true })
    .click();
  let reordered = JSON.parse(
    await page.locator("input[name=sections]").inputValue(),
  );
  expect(reordered[2].id).toBe(banner);
  await page
    .getByRole("button", { name: "Subir seção 4", exact: true })
    .click();
  const block = page.locator(`#block-${lead}`);
  await block
    .locator(".slot-config.slot-advertising")
    .first()
    .getByLabel("Peça do espaço")
    .selectOption(campaign);
  await block
    .locator(".slot-config.slot-google")
    .getByLabel("Identificador do bloco Google")
    .fill("1234567890");
  await page.getByRole("tab", { name: "Monetização", exact: true }).click();
  await page.locator(".advertising-settings summary").click();
  await page
    .getByLabel("Código do AdSense")
    .fill(
      '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456" crossorigin="anonymous"></script>',
    );
  await page
    .getByRole("button", { name: "Importar código", exact: true })
    .click();
  await expect(
    page.getByLabel("Identificador do Google", { exact: true }),
  ).toHaveValue("ca-pub-1234567890123456");
  expect(scripts).toBe(0);
  await page.screenshot({
    path: "/tmp/ads-visual-editor.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Publicar homepage", exact: true })
    .click();
  await expect(
    page.getByText("Homepage publicada.", { exact: true }),
  ).toBeVisible();
  const saved = await admin
    .from("portals")
    .select("home_published,settings")
    .eq("id", portal)
    .single();
  expect(saved.data?.settings.advertising.enabled).toBe(true);
  expect(
    saved.data?.home_published.find((s: any) => s.id === lead).adSlots.length,
  ).toBe(4);
  await page.goto(`/painel/${portal}/aparencia`);
  await page.getByLabel("Ativar Google AdSense neste portal").uncheck();
  await page
    .getByRole("button", { name: "Salvar personalização", exact: true })
    .click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  const off = await admin
    .from("portals")
    .select("settings")
    .eq("id", portal)
    .single();
  expect(off.data?.settings.advertising.enabled).toBe(false);
  await page.getByLabel("Ativar Google AdSense neste portal").check();
  await page
    .getByRole("button", { name: "Salvar personalização", exact: true })
    .click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  for (const template of ["classic", "modern", "daily"]) {
    await admin.from("portals").update({ template }).eq("id", portal);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/p/${slug}`);
    const adsTxt = await page.request.get(`/p/${slug}/ads.txt`);
    expect(adsTxt.status()).toBe(200);
    expect(await adsTxt.text()).toContain(
      "google.com, pub-1234567890123456, DIRECT",
    );
    await expect(page.locator(".slot-kind-google ins.adsbygoogle")).toHaveCount(
      1,
    );
    await expect(
      page.locator(".slot-kind-google ins.adsbygoogle"),
    ).toHaveAttribute("data-adsbygoogle-status", "done");
    await expect(page.locator(`[data-campaign-id="${campaign}"]`)).toHaveCount(
      1,
    );
    await page.setViewportSize({ width: 375, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/ads-${template}-mobile.png`,
      fullPage: true,
    });
  }
  await page.goto(`/painel/${portal}/publicidade`);
  await page.getByLabel("Nome", { exact: true }).fill("Google na notícia");
  await page.getByLabel("Tipo de conteúdo").selectOption("google");
  await page.getByLabel("Identificador do bloco Google").fill("9876543210");
  await page
    .getByLabel("Posição", { exact: true })
    .selectOption("article-middle");
  await page
    .getByRole("button", { name: "Salvar campanha", exact: true })
    .click();
  await expect(
    page.getByText("Campanha salva.", { exact: true }),
  ).toBeVisible();
  const side = await admin
    .from("campaigns")
    .insert({
      organization_id: org,
      portal_id: portal,
      name: "Google na editoria",
      image_url: "",
      link: "",
      position: "sidebar",
      active: true,
      creative: {
        mediaType: "google",
        format: "rectangle",
        googleSlot: "5555555555",
        pageKinds: ["category", "search", "page"],
      },
    });
  if (side.error) throw side.error;
  await page.goto(`/p/${slug}/categoria/politica`);
  await expect(
    page.locator('.archive-ad-rail ins[data-ad-slot="5555555555"]'),
  ).toHaveCount(1);
  await page.goto(`/p/${slug}/busca?q=editorial`);
  await expect(
    page.locator('.archive-ad-rail ins[data-ad-slot="5555555555"]'),
  ).toHaveCount(1);
  await page.goto(`/p/${slug}/noticia/historia-0`);
  await expect(
    page.locator('.article-body ins[data-ad-slot="9876543210"]'),
  ).toHaveCount(1);
});
