import { test } from "node:test";
import assert from "node:assert/strict";
import { experienceSchema } from "../src/lib/experience.ts";
import { presentationSettings } from "../src/lib/presentation.ts";
import {
  widgetPosition,
  widgetEnabled,
  reconcileLegacyWidgets,
} from "../src/lib/widgets.ts";
test("Blocos preservam textos vazios, links seguros e posições com fallback por página", () => {
  const e = experienceSchema.parse({
    search: { enabled: false },
    newsletter: {
      title: "",
      buttonLabel: "Participar",
      consentText: "Aceito",
      position: "after-section",
      sectionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
    commercial: {
      body: "Minha chamada",
      contentType: "image",
      imageLink: "https://example.com",
    },
  });
  assert.equal(e.newsletter.title, "");
  assert.equal(
    widgetPosition(e, "newsletter", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]),
    "after-section",
  );
  assert.equal(widgetPosition(e, "newsletter", [], false), "after-content");
  assert.equal(widgetEnabled({ experience: e }, "search"), false);
  assert.equal(
    experienceSchema.safeParse({
      commercial: { imageLink: "javascript:alert(1)" },
    }).success,
    false,
  );
  for (const template of ["classic", "modern", "daily"]) {
    const s = presentationSettings(
      {
        newsletterEnabled: false,
        contactEnabled: false,
        commercialText: "Texto antigo",
      },
      template,
    );
    assert.equal(s.experience.newsletter.showForm, false);
    assert.equal(s.experience.contact.enabled, false);
    assert.equal(s.experience.commercial.body, "Texto antigo");
  }
});
test("Edição antiga e inspetor mantêm uma única copy, sem sobrescrever alteração explícita do bloco", () => {
  const previous = {
    commercialText: "Antes",
    newsletterTitle: "Novidades",
    contactEnabled: true,
  };
  const incoming = {
    commercial: { body: "Antes" },
    newsletter: { title: "Novidades" },
    contact: { enabled: true },
  };
  const legacy = {
    commercialText: "Depois",
    newsletterTitle: "Canal atualizado",
    contactEnabled: false,
  };
  const next = reconcileLegacyWidgets(previous, incoming, legacy);
  assert.equal(next.commercial.body, "Depois");
  assert.equal(next.newsletter.title, "Canal atualizado");
  assert.equal(next.contact.enabled, false);
  const chosen = reconcileLegacyWidgets(
    previous,
    { ...incoming, commercial: { body: "Copy do inspetor" } },
    legacy,
  );
  assert.equal(chosen.commercial.body, "Copy do inspetor");
});

test("Campos antigos exibem a copy efetiva do inspetor, inclusive textos longos e vazios", () => {
  const body = "Uma chamada editorial completa. ".repeat(30);
  const settings = presentationSettings(
    {
      commercialText: "Antigo",
      newsletterTitle: "Antigo",
      experience: {
        commercial: { body },
        newsletter: { title: "", showForm: false },
        contact: { title: "Contato novo", enabled: false },
      },
    },
    "classic",
  );
  assert.equal(settings.commercialText, body);
  assert.equal(settings.newsletterTitle, "");
  assert.equal(settings.contactTitle, "Contato novo");
  assert.equal(settings.contactEnabled, false);
  assert.equal(settings.newsletterEnabled, false);
});

test("Cabeçalho valida modos sem menu e busca; desativação de formulários preserva bloqueio de recebimento", async () => {
  const { widgetReaderFlags } = await import("../src/lib/widgets.ts");
  const e = experienceSchema.parse({
    navigation: {
      layout: "hidden",
      sticky: true,
      shrinkOnScroll: true,
      compactHeight: 56,
    },
    search: { preset: "pill", customStyle: false },
    contact: { enabled: false },
    newsletter: { enabled: true, contentType: "image" },
  });
  assert.equal(e.navigation.layout, "hidden");
  assert.equal(e.search.preset, "pill");
  assert.deepEqual(widgetReaderFlags({ experience: e }), {
    contactEnabled: false,
    newsletterEnabled: false,
  });
  assert.equal(
    experienceSchema.safeParse({ navigation: { headerHeight: 900 } }).success,
    false,
  );
});
