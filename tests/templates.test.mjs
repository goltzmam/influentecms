import { test } from "node:test";
import assert from "node:assert/strict";
import {
  referenceSections,
  presentationSettings,
} from "../src/lib/presentation.ts";
test("Cada tema inicia com sua própria sequência editorial sem alterar categorias ou conteúdo salvo", () => {
  const categories = [
    {
      id: "00000000-0000-4000-8000-000000000011",
      slug: "politica",
      name: "Política",
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      slug: "cultura",
      name: "Cultura",
    },
  ];
  const source = structuredClone(categories),
    classic = referenceSections(categories, "classic"),
    modern = referenceSections(categories, "modern"),
    daily = referenceSections(categories, "daily");
  assert.deepEqual(
    classic.map((s) => s.type),
    ["lead", "sponsored", "category", "banner", "category"],
  );
  assert.deepEqual(
    modern.map((s) => s.type),
    ["lead", "latest", "banner", "category", "category", "sponsored"],
  );
  assert.deepEqual(
    daily.map((s) => s.type),
    ["lead", "banner", "latest"],
  );
  assert.deepEqual(categories, source);
  for (const blocks of [classic, modern, daily])
    assert.equal(new Set(blocks.map((s) => s.id)).size, blocks.length);
});
test("Identidades padrão dos temas são independentes e configurações explícitas continuam prevalecendo", () => {
  assert.equal(
    presentationSettings({}, "modern").experience.navigation.logoAlign,
    "center",
  );
  assert.equal(
    presentationSettings({}, "daily").experience.navigation.layout,
    "burger",
  );
  assert.equal(
    presentationSettings({}, "classic").experience.navigation.layout,
    "horizontal",
  );
  for (const theme of ["classic", "modern", "daily"]) {
    const s = presentationSettings(
      {
        color: "#123456",
        experience: {
          navigation: { layout: "sidebar", logoAlign: "left" },
          footer: { background: "#998877", color: "#112233" },
        },
      },
      theme,
    );
    assert.equal(s.color, "#123456");
    assert.equal(s.experience.navigation.layout, "sidebar");
    assert.equal(s.experience.navigation.logoAlign, "left");
    assert.equal(s.experience.footer.background, "#998877");
    assert.equal(s.experience.footer.color, "#112233");
  }
});
