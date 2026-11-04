import { test } from "node:test";
import assert from "node:assert/strict";
import {
  experienceSchema,
  menuSchema,
  creativeSchema,
  campaignMatches,
} from "../src/lib/experience.ts";
import { sectionsSchema } from "../src/lib/validation.ts";
import { splitArticleContent } from "../src/lib/content.ts";
import { brandImage } from "../src/lib/ai/brand-renderer.ts";
import sharp from "sharp";
test("Menus, formulário e rodapé respeitam limites e endereços seguros", () => {
  assert.ok(
    menuSchema.safeParse({
      label: "Notícias",
      url: "/",
      children: [
        {
          label: "Brasil",
          url: "/categoria/brasil",
          children: [{ label: "Economia", url: "/categoria/economia" }],
        },
      ],
    }).success,
  );
  assert.equal(
    menuSchema.safeParse({ label: "Inseguro", url: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    experienceSchema.safeParse({ contact: { maxWidth: 9999 } }).success,
    false,
  );
  assert.equal(
    experienceSchema.safeParse({
      footer: { advertVideo: "https://evil.example/embed" },
    }).success,
    false,
  );
  assert.ok(
    experienceSchema.safeParse({
      navigation: { layout: "hybrid" },
      contact: { mode: "compact", maxWidth: 440, fields: ["phone"] },
      footer: {
        advertImage: "https://example.com/ad.png",
        advertLink: "https://example.com/anuncie",
      },
    }).success,
  );
});
test("Campanhas respeitam página, editoria e destino específico", () => {
  const c = creativeSchema.parse({
    pageKinds: ["article"],
    pageSlugs: ["/noticia/analise"],
    categoryIds: ["00000000-0000-4000-8000-000000000001"],
  });
  assert.equal(campaignMatches(c, { kind: "home" }), false);
  assert.equal(
    campaignMatches(c, {
      kind: "article",
      slug: "outra",
      categoryId: c.categoryIds[0],
    }),
    false,
  );
  assert.equal(
    campaignMatches(c, {
      kind: "article",
      slug: "analise",
      categoryId: c.categoryIds[0],
    }),
    true,
  );
  assert.equal(creativeSchema.safeParse({ width: 999999 }).success, false);
  assert.equal(
    creativeSchema.safeParse({
      mediaType: "video",
      videoUrl: "https://evil.example/embed",
    }).success,
    false,
  );
});
test("Estilo de títulos é independente do fundo e da copy", () => {
  const sections = sectionsSchema.parse([
    {
      id: "00000000-0000-4000-8000-000000000001",
      type: "text",
      title: "Manifesto",
      text: "Conteúdo original.",
      titleBackground: "#df1020",
      titleColor: "#ffffff",
      copyColor: "#162c22",
      backgroundColor: "#ffffff",
    },
  ]);
  assert.equal(sections[0].titleBackground, "#df1020");
  assert.equal(sections[0].backgroundColor, "#ffffff");
  assert.equal(sections[0].copyColor, "#162c22");
});
test("Anúncios no texto não quebram elementos aninhados e removem scripts", () => {
  const [one, two] = splitArticleContent(
    "<blockquote><p>Um</p><p>Dois</p></blockquote><p>Três</p><p>Quatro</p><script>alert(1)</script>",
  );
  assert.ok(one.endsWith("</blockquote>"));
  assert.ok(two.startsWith("<p>"));
  assert.ok(!(one + two).includes("<script>"));
});
test("Arte de marca inclui fonte para acentos e símbolos sem depender do servidor", async () => {
  for (const kind of ["logo", "favicon", "cover"]) {
    const image = await brandImage({
      name: "Saúde & Inovação",
      title: "Negócios e inteligência para o Ceará",
      color: "#173c2b",
      accent: "#dfef81",
      kind,
    });
    const info = await sharp(image).metadata();
    assert.equal(info.format, "webp");
    assert.equal(
      info.width,
      kind === "cover" ? 1200 : kind === "logo" ? 1000 : 192,
    );
    assert.ok(image.length > 1000);
  }
});
