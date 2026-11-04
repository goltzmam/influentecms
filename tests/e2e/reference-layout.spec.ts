import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
let admin: SupabaseClient,
  org: string,
  userId: string,
  email: string,
  password: string;
const created: { id: string; slug: string; name: string }[] = [];
const suffix = randomUUID().slice(0, 8);
async function checked<T extends { error: unknown }>(promise: PromiseLike<T>) {
  const result = await promise;
  if (result.error) throw result.error;
  return result;
}
test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("Teste somente local.");
  admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  email = `reference-${suffix}@example.test`;
  password = randomBytes(24).toString("base64url");
  const user = await checked(
    admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  userId = user.data.user!.id;
  const organization = await checked(
    admin
      .from("organizations")
      .insert({ name: `Referência ${suffix}` })
      .select("id")
      .single(),
  );
  org = organization.data!.id;
  await checked(
    admin
      .from("organization_members")
      .insert({ organization_id: org, user_id: userId }),
  );
  for (const [index, template] of ["classic", "modern"].entries()) {
    const name = index ? "Revista Influente" : "Influente News",
      slug = `referencia-${index}-${suffix}`;
    const portal = await checked(
      admin
        .from("portals")
        .insert({
          organization_id: org,
          name,
          slug,
          template,
          settings: {
            color: "#6324dc",
            accentColor: "#d5ff00",
            whatsappUrl: "https://example.com/canal",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            videoTitle: "Entrevistas e debates da semana",
            videosLink: "/categoria/politica",
            tagline: index
              ? "Histórias que influenciam."
              : "Notícia por onde você passa.",
            font: index ? "serif" : "sans",
          },
        })
        .select("id")
        .single(),
    );
    const id = portal.data!.id;
    created.push({ id, name, slug });
    const categories = await checked(
      admin
        .from("categories")
        .insert([
          {
            organization_id: org,
            portal_id: id,
            name: "Política",
            slug: "politica",
          },
          {
            organization_id: org,
            portal_id: id,
            name: "Entretenimento",
            slug: "entretenimento",
          },
        ])
        .select("id,name"),
    );
    const image = await sharp({
      create: {
        width: 900,
        height: 560,
        channels: 3,
        background: index ? "#593a80" : "#584770",
      },
    })
      .webp()
      .toBuffer();
    const path = `${org}/${id}/fixture.webp`;
    await checked(
      admin.storage
        .from("portal-media")
        .upload(path, image, { contentType: "image/webp" }),
    );
    const imageUrl = admin.storage.from("portal-media").getPublicUrl(path)
      .data.publicUrl;
    await checked(
      admin
        .from("media")
        .insert({
          organization_id: org,
          portal_id: id,
          name: "Fixture de teste",
          path,
          url: imageUrl,
          size: image.length,
        }),
    );
    const articles = await checked(
      admin
        .from("articles")
        .insert(
          Array.from({ length: 20 }, (_, n) => ({
            organization_id: org,
            portal_id: id,
            title:
              n === 0
                ? "As decisões que movimentam a semana"
                : "Notícia editorial de teste " + n,
            slug: `noticia-${n}`,
            subtitle:
              "Contexto e informação em uma publicação de teste, removida ao final da validação.",
            content: "<p>Conteúdo de teste isolado.</p>",
            cover_url: imageUrl,
            cover_alt: "Imagem exclusiva da fixture de teste",
            author: "Redação",
            category_id: categories.data![n % 2].id,
            status: "published",
            publish_at: new Date(Date.now() - n * 60000 - 60000).toISOString(),
          })),
        )
        .select("id"),
    );
    const ad = await sharp({
      create: { width: 900, height: 150, channels: 3, background: "#ffdc29" },
    })
      .webp()
      .toBuffer();
    const adPath = `${org}/${id}/banner.webp`;
    await checked(
      admin.storage
        .from("portal-media")
        .upload(adPath, ad, { contentType: "image/webp" }),
    );
    const adUrl = admin.storage.from("portal-media").getPublicUrl(adPath)
      .data.publicUrl;
    await checked(
      admin
        .from("media")
        .insert({
          organization_id: org,
          portal_id: id,
          name: "Banner exclusivo de teste",
          path: adPath,
          url: adUrl,
          size: ad.length,
        }),
    );
    await checked(
      admin
        .from("campaigns")
        .insert(
          [
            "header",
            "sidebar",
            "between",
            "category",
            "sponsored",
            "footer",
          ].map((position) => ({
            organization_id: org,
            portal_id: id,
            name: `Campanha de teste ${position}`,
            image_url: adUrl,
            link: "https://example.com",
            position,
            active: true,
          })),
        ),
    );
    const sections = [
      { id: randomUUID(), type: "lead", title: "" },
      {
        id: randomUUID(),
        type: "sponsored",
        title: "Publieditorial",
        articleIds: [articles.data![12].id],
      },
      ...categories.data!.map((c, n) => ({
        id: randomUUID(),
        type: "category",
        title: c.name,
        categoryId: c.id,
        layout: n ? "magazine" : "news",
        sponsorName: "Marca de teste",
        sponsorLink: "https://example.com",
        position: "category",
      })),
    ];
    sections.splice(3, 0, {
      id: randomUUID(),
      type: "banner",
      title: "",
      position: "between",
    } as (typeof sections)[number]);
    await checked(
      admin
        .from("portals")
        .update({
          home_draft: sections,
          home_published: sections,
          settings: {
            color: "#6324dc",
            accentColor: "#d5ff00",
            font: index ? "serif" : "sans",
            tagline: index
              ? "Histórias que influenciam."
              : "Notícia por onde você passa.",
            whatsappUrl: "https://example.com/canal",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            videoTitle: "Entrevistas e debates da semana",
            videosLink: "/categoria/politica",
            contactEmail: "redacao@example.test",
            commercialEmail: "comercial@example.test",
            socials: [
              { label: "Instagram", url: "https://example.com/instagram" },
            ],
            socialCards: [
              {
                label: "Instagram",
                image: imageUrl,
                url: "https://example.com/instagram",
              },
              {
                label: "Facebook",
                image: imageUrl,
                url: "https://example.com/facebook",
              },
            ],
          },
        })
        .eq("id", id),
    );
  }
});
test.afterAll(async () => {
  if (!admin) return;
  if (org) {
    const { data } = await admin
      .from("media")
      .select("path")
      .eq("organization_id", org);
    if (data?.length)
      await checked(
        admin.storage.from("portal-media").remove(data.map((m) => m.path)),
      );
    await checked(admin.from("organizations").delete().eq("id", org));
  }
  if (userId) await checked(admin.auth.admin.deleteUser(userId));
});
test("PDF: mesma composição nos dois templates, carrossel, paleta, contato e inscrição reais", async ({
  page,
}, testInfo) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><body style="background:#21152e;color:white">Vídeo externo de teste</body></html>',
    }),
  );
  for (const portal of created) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/p/${portal.slug}`);
    await expect(page.locator(".reference-header")).toHaveCSS(
      "background-color",
      "rgb(99, 36, 220)",
    );
    await expect(page.locator(".reference-carousel")).toBeVisible();
    await expect(page.locator(".reference-video iframe")).toHaveAttribute(
      "src",
      /youtube-nocookie/,
    );
    await expect(page.locator(".reference-category")).toHaveCount(2);
    await expect(page.locator(".section-sponsor")).toHaveCount(2);
    await expect(page.locator(".sponsored-strip")).toBeVisible();
    await expect(page.locator(".community-cards>a")).toHaveCount(2);
    await page.getByRole("button", { name: /^Manchete 2:/ }).click();
    await expect(
      page.getByRole("button", { name: /^Manchete 2:/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: testInfo.outputPath(
        `${portal.name.replaceAll(" ", "-")}-desktop.png`,
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `${portal.name.replaceAll(" ", "-")}-mobile.png`,
      ),
      fullPage: true,
    });
  }
  const first = created[0];
  await page.goto(`/p/${first.slug}`);
  const contact = page.locator(".reader-contact");
  if(await contact.locator("summary").count())await contact.locator("summary").click();
  await contact.getByLabel("Nome *", { exact: true }).fill("Leitora de teste");
  await contact
    .getByLabel("E-mail *", { exact: true })
    .fill(`reader-${suffix}@example.test`);
  await contact
    .getByLabel("Assunto *", { exact: true })
    .fill("Contato de teste");
  await contact
    .getByLabel("Sua mensagem *", { exact: true })
    .fill("Mensagem de validação da estrutura do portal.");
  await contact
    .getByLabel("Autorizo o uso destes dados para responder minha mensagem.")
    .check();
  await contact.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(contact.getByRole("status")).toContainText(
    "Mensagem registrada.",
  );
  const newsletter = page.locator(".newsletter-signup");
  await newsletter
    .getByLabel("E-mail para novidades")
    .fill(`reader-${suffix}@example.test`);
  await newsletter.getByLabel("Quero receber novidades por e-mail.").check();
  await newsletter
    .getByRole("button", { name: "Assinar", exact: true })
    .click();
  await expect(newsletter.getByRole("status")).toContainText(
    "Inscrição registrada.",
  );
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto(`/painel/${first.id}/leitores`);
  await expect(
    page.getByText("Contato de teste · Leitora de teste · Outro"),
  ).toBeVisible();
  await expect(
    page.getByText(`reader-${suffix}@example.test`, { exact: true }),
  ).toBeVisible();
  const exported=await page.request.get(`/painel/${first.id}/leitores/exportar?tipo=mensagens`);expect(exported.status()).toBe(200);expect(exported.headers()['content-type']).toContain('text/csv');expect(await exported.text()).toContain(`reader-${suffix}@example.test`);
  await page.goto(`/painel/${created[1].id}/leitores`);
  await expect(page.getByText("Nenhuma mensagem recebida.")).toBeVisible();
  await expect(page.getByText("Nenhuma inscrição recebida.")).toBeVisible();
  await page.goto(`/painel/${first.id}/aparencia`);
  await page.getByLabel("Cor principal", { exact: true }).fill("#194d65");
  await page.getByLabel("Cor de destaque", { exact: true }).fill("#ffde73");
  await page.getByRole("button", { name: "Salvar personalização" }).click();
  await expect(
    page.getByText("Personalização salva.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/p/${first.slug}`);
  await expect(page.locator(".reference-header")).toHaveCSS(
    "background-color",
    "rgb(25, 77, 101)",
  );
  await expect(page.locator(".editoria-heading").first()).toHaveCSS(
    "background-color",
    "rgb(255, 222, 115)",
  );
  await page.goto(`/painel/${first.id}/aparencia`);
  await page.getByLabel('Organização do menu',{exact:true}).selectOption('custom');
  const navigation=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Menu de navegação',exact:true})});
  await navigation.getByRole('button',{name:'+ Adicionar item ao menu',exact:true}).click();
  await navigation.getByRole('button',{name:'+ Adicionar item ao menu',exact:true}).click();
  await navigation.getByLabel('Nome do item',{exact:true}).nth(0).fill('Sobre a publicação');await navigation.getByLabel('Destino do item',{exact:true}).nth(0).fill('/pagina/sobre');
  await navigation.getByLabel('Nome do item',{exact:true}).nth(1).fill('Notícias');await navigation.getByLabel('Destino do item',{exact:true}).nth(1).fill('/busca?q=noticia');
  await navigation.getByRole('button',{name:'Subir item 2',exact:true}).click();
  await page.getByRole('button',{name:'Salvar personalização'}).click();await expect(page.getByText('Personalização salva.',{exact:true})).toBeVisible();
  await page.goto(`/p/${first.slug}`);await expect(page.locator('.news-nav a').first()).toHaveText('Notícias');await expect(page.locator('.news-nav a')).toHaveCount(2);

});
