import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  editorialIllustration,
  demonstrationArt,
  visualTheme,
  generatedVisual,
} from "../src/lib/ai/visuals.ts";
test("FLUE produz imagens editoriais originais por tema e peças demonstrativas editáveis", async () => {
  assert.equal(visualTheme("Alimentação e nutrição"), "food");
  const one = await editorialIllustration({
      name: "SaudeFIT",
      title: "Treino e movimento",
      color: "#235f48",
      accent: "#d4ee81",
    }),
    two = await editorialIllustration({
      name: "SaudeFIT",
      title: "Alimentação equilibrada",
      color: "#235f48",
      accent: "#d4ee81",
    });
  assert.notDeepEqual(one, two);
  const info = await sharp(one).metadata();
  assert.equal(info.width, 1200);
  assert.equal(info.height, 800);
  for (const kind of [
    "banner",
    "sponsor",
    "partner",
    "vertical",
    "rectangle",
  ]) {
    const b = await demonstrationArt({
      name: "Saúde & Negócios",
      color: "#235f48",
      accent: "#d4ee81",
      kind,
    });
    assert.ok(b.length > 1000);
  }
});
test("Geração visual usa somente um modelo de imagem realmente listado e reencodifica resultado", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    const png = await sharp({
      create: { width: 200, height: 150, channels: 3, background: "#aabbaa" },
    })
      .png()
      .toBuffer();
    let requests = 0;
    const fake = async (url, options) => {
      requests++;
      if (url.endsWith("/models"))
        return Response.json({
          models: [
            {
              name: "models/gemini-flash-image-test",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        });
      assert.match(url, /gemini-flash-image-test:generateContent/);
      assert.ok(
        JSON.parse(options.body).generationConfig.responseModalities.includes(
          "IMAGE",
        ),
      );
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: png.toString("base64"),
                  },
                },
              ],
            },
          },
        ],
      });
    };
    const image = await generatedVisual("Fitness editorial", undefined, fake);
    assert.equal((await sharp(image).metadata()).format, "webp");
    assert.equal(requests, 2);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
