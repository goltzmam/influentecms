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
  slug = "widgets-" + suffix;
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
  await admin.from("domains").insert({
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
test("Blocos editáveis: copy salva, busca, logos distintos, posições, imagem com link e ocultar nos três temas", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto(`/painel/${portal}/aparencia`);
  await page
    .getByRole("tab", { name: "Chamada comercial", exact: true })
    .click();
  await page
    .getByLabel("Título da chamada comercial", { exact: true })
    .fill("Anuncie no nosso portal");
  await page
    .getByLabel("Texto da chamada comercial", { exact: true })
    .fill("Sua marca encontra nosso público aqui.");
  await page
    .getByLabel("Destino da chamada comercial", { exact: true })
    .fill("https://example.com/midia");
  await page
    .getByLabel("Local do bloco", { exact: true })
    .selectOption("before-content");
  await page.getByRole("tab", { name: "Novidades", exact: true }).click();
  await page
    .getByLabel("Título das novidades", { exact: true })
    .fill("Boletim exclusivo");
  await page
    .getByLabel("Texto dentro do campo de e-mail", { exact: true })
    .fill("Digite seu melhor e-mail");
  await page
    .getByLabel("Texto do botão de inscrição", { exact: true })
    .fill("Quero receber");
  await page
    .getByLabel("Texto de consentimento da inscrição", { exact: true })
    .fill("Aceito receber nosso boletim.");
  await page
    .getByLabel("Local do bloco", { exact: true })
    .selectOption("after-content");
  await page.getByRole("tab", { name: "Busca", exact: true }).click();
  await page
    .getByLabel("Texto dentro da busca", { exact: true })
    .fill("Encontre uma história");
  await page
    .getByLabel("Texto do botão de busca", { exact: true })
    .fill("Pesquisar");
  await page.getByLabel("Título da busca", {exact:true}).fill("Encontre notícias");
  await page.getByLabel("Descrição da busca", {exact:true}).fill("Explore nossas editorias");
  await page.getByLabel("Formato do botão", {exact:true}).selectOption("both");
  await page.getByLabel("Estrutura da busca", {exact:true}).selectOption("stacked");
  await page.getByLabel("Ativar busca no portal", {exact:true}).uncheck();
  await page.getByLabel("Ativar busca no portal", {exact:true}).check();
  await page
    .getByRole("button", { name: "Salvar personalização", exact: true })
    .click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  const saved = (
    await admin
      .from("portals")
      .select("settings,home_published")
      .eq("id", portal)
      .single()
  ).data!;
  expect(saved.settings.experience.search.title).toBe("Encontre notícias");
  expect(saved.settings.experience.search.layout).toBe("stacked");
  expect(saved.settings.experience.search.buttonMode).toBe("both");
  expect(saved.settings.experience.search.enabled).toBe(true);
  expect(saved.settings.experience.commercial.body).toBe(
    "Sua marca encontra nosso público aqui.",
  );
  const image = admin.storage.from("portal-media").getPublicUrl(file)
    .data.publicUrl;
  const sections = [
    {
      id: randomUUID(),
      type: "text",
      title: "Seção um",
      text: "Conteúdo editorial um.",
    },
    {
      id: randomUUID(),
      type: "text",
      title: "Seção dois",
      text: "Conteúdo editorial dois.",
    },
  ];
  for (const template of ["classic", "modern", "daily"]) {
    const settings = {
      ...saved.settings,
      experience: {
        ...saved.settings.experience,
        navigation: {
          ...saved.settings.experience.navigation,
          logo: image + "?header",
        },
        footer: {
          ...saved.settings.experience.footer,
          logo: image + "?footer",
        },
        newsletter: {
          ...saved.settings.experience.newsletter,
          position: "after-section",
          sectionId: sections[0].id,
        },
      },
    };
    await admin
      .from("portals")
      .update({
        template,
        settings,
        home_published: sections,
        home_draft: sections,
      })
      .eq("id", portal);
    await page.goto("/p/" + slug);
    await expect(page.locator("header .news-logo img").first()).toHaveAttribute(
      "src",
      image + "?header",
    );
    await expect(
      page.locator(".news-footer .news-logo img").first(),
    ).toHaveAttribute("src", image + "?footer");
    await expect(page.locator('[data-widget-kind="commercial"]')).toContainText(
      "Sua marca encontra nosso público aqui.",
    );
    await expect(page.getByPlaceholder("Encontre uma história")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pesquisar", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Digite seu melhor e-mail"),
    ).toBeVisible();
    await expect(
      page.getByText("Aceito receber nosso boletim.", { exact: true }),
    ).toBeVisible();
    const order = await page
      .locator('[data-section-id], [data-widget-kind="newsletter"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-section-id") || "newsletter"),
      );
    expect(order.indexOf("newsletter")).toBeGreaterThan(
      order.indexOf(sections[0].id),
    );
    expect(order.indexOf("newsletter")).toBeLessThan(
      order.indexOf(sections[1].id),
    );
    settings.experience.commercial = {
      ...settings.experience.commercial,
      contentType: "image",
      image,
      imageLink: "https://example.com/anunciante",
    };
    settings.experience.newsletter = {
      ...settings.experience.newsletter,
      enabled: false,
    };
    settings.experience.search = {
      ...settings.experience.search,
      enabled: false,
    };
    await admin.from("portals").update({ settings }).eq("id", portal);
    await page.reload();
    await expect(page.locator('[data-widget-kind="newsletter"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-widget-kind="search"]')).toHaveCount(0);
    const ad = page.locator('[data-widget-kind="commercial"]');
    await expect(ad.getByRole("img")).toBeVisible();
    await expect(ad.locator("a")).toHaveAttribute(
      "href",
      "https://example.com/anunciante",
    );
    await expect(ad).not.toContainText(
      "Sua marca encontra nosso público aqui.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto(`/painel/${portal}/homepage`);
  await page
    .getByRole("button", { name: "Novidades por e-mail", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Novidades", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData("application/x-influente-widget", "newsletter");
    return data;
  });
  await page
    .locator(`.visual-canvas [data-section-id="${sections[1].id}"]`)
    .first()
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByLabel("Local do bloco", { exact: true })).toHaveValue(
    "before-section",
  );
  await expect(
    page.getByLabel("Seção de referência", { exact: true }),
  ).toHaveValue(sections[1].id);
  await page
    .getByRole("button", { name: "Chamada comercial", exact: true })
    .click();
  await page
    .getByLabel("Conteúdo do bloco", { exact: true })
    .selectOption("content");
  await page
    .getByLabel("Texto da chamada comercial", { exact: true })
    .fill("Copy alterada na prévia em tempo real.");
  await expect(
    page.locator('.visual-canvas [data-widget-kind="commercial"]'),
  ).toContainText("Copy alterada na prévia em tempo real.");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /Rascunho/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publicar homepage", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /publicada/ }),
  ).toBeVisible();
  await page.goto("/p/" + slug);
  await expect(page.locator('[data-widget-kind="commercial"]')).toContainText(
    "Copy alterada na prévia em tempo real.",
  );
});

test("Cabeçalho compacto: menu burger, horizontal, oculto, busca com presets e redução ao rolar nos três temas", async ({
  page,
}) => {
  const row = await admin
    .from("portals")
    .select("settings")
    .eq("id", portal)
    .single();
  if (row.error) throw row.error;
  for (const template of ["classic", "modern", "daily"]) {
    const settings = {
      ...row.data.settings,
      menusMode: "custom",
      menus: Array.from({ length: 8 }, (_, i) => ({
        label: "Editoria " + i,
        url: "/categoria/editoria-" + i,
      })),
      experience: {
        ...row.data.settings.experience,
        navigation: {
          enabled: true,
          layout: "burger",
          logoAlign: "center",
          sticky: true,
          shrinkOnScroll: true,
          headerHeight: 84,
          compactHeight: 56,
          customColors: true,
          background: "#111111",
          color: "#ffffff",
        },
        search: {
          enabled: true,
          position: "header",
          preset: "outline",
          placeholder: "Pesquisar notícias",
          buttonLabel: "Buscar",
          customStyle: false,
        },
        newsletter: { enabled: false },
        contact: { enabled: false },
        commercial: { enabled: false },
      },
    };
    await admin
      .from("portals")
      .update({
        template,
        settings,
        home_published: Array.from({ length: 10 }, (_, i) => ({
          id: randomUUID(),
          type: "text",
          title: "Seção " + i,
          text: "Conteúdo editorial para verificar rolagem e espaçamento. ".repeat(
            15,
          ),
        })),
      })
      .eq("id", portal);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/p/" + slug);
    const header = page.locator(".header-adaptive");
    await expect(header.locator(".portal-nav-inline")).not.toBeVisible();
    await expect(
      header.getByRole("button", { name: "Abrir menu", exact: true }),
    ).toBeVisible();
    const expanded = await header.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(expanded, template + " expanded height").toBeLessThan(120);
    await header
      .getByRole("button", { name: "Abrir menu", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Menu do portal" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Fechar menu", exact: true })
      .click();
    await page.evaluate(() => window.scrollTo(0, 650));
    await expect(header).toHaveAttribute("data-header-compact", "true");
    await expect
      .poll(() => header.evaluate((el) => el.getBoundingClientRect().height))
      .toBeLessThan(expanded);
    expect(
      await header.evaluate((el) => el.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(-1);
    if (template === "classic")
      await page.screenshot({ path: "/tmp/influente-header-compact.png" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).toHaveAttribute("data-header-compact", "false");
    for (const preset of ["outline", "filled", "minimal", "pill", "card"]) {
      settings.experience.search.preset = preset;
      await admin.from("portals").update({ settings }).eq("id", portal);
      await page.reload();
      await expect(header.locator(".configurable-search")).toHaveClass(
        new RegExp("search-preset-" + preset),
      );
      await expect(header.getByPlaceholder("Pesquisar notícias")).toBeVisible();
      expect(
        await header
          .locator(".configurable-search button")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(12);
    }
    settings.experience.navigation.layout = "horizontal";
    await admin.from("portals").update({ settings }).eq("id", portal);
    await page.reload();
    await expect(header.locator(".portal-nav-inline")).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Abrir menu", exact: true }),
    ).not.toBeVisible();
    settings.experience.navigation.layout = "hidden";
    settings.experience.search.enabled = false;
    await admin.from("portals").update({ settings }).eq("id", portal);
    await page.reload();
    await expect(header.locator(".portal-navigation")).toHaveCount(0);
    await expect(header.locator('[data-widget-kind="search"]')).toHaveCount(0);
    settings.experience.navigation.layout = "burger";
    settings.experience.search.enabled = true;
    await admin.from("portals").update({ settings }).eq("id", portal);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(
      header.getByRole("button", { name: "Abrir busca", exact: true }),
    ).toBeVisible();
    await header
      .getByRole("button", { name: "Abrir busca", exact: true })
      .click();
    await expect(header.getByPlaceholder("Pesquisar notícias")).toBeVisible();
    for (const width of [320, 390, 760]) {
      await page.setViewportSize({width, height:844});
      const field = header.getByPlaceholder("Pesquisar notícias");
      expect(await field.evaluate(el => el.getBoundingClientRect().width), template + " input at " + width).toBeGreaterThan(width === 320 ? 140 : 190);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    }
    await page.setViewportSize({width:390, height:844});
    const mobileInput = header.getByPlaceholder("Pesquisar notícias");
    expect(await mobileInput.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(190);
    expect(await mobileInput.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(mobileInput).toBeFocused();
    await mobileInput.fill("rotina");
    await header.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/\/busca\?q=rotina/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    if (template === "classic")
      await page.screenshot({ path: "/tmp/influente-header-mobile.png" });
  }
});
