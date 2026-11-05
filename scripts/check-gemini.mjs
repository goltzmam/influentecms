// Optional deployment verification: never logs credentials or generated content.
import { generateBlueprint } from "../src/lib/ai/gemini.ts";
try {
  const result = await generateBlueprint({
    brief:
      "Crie um portal editorial de fitness chamado SaudeFIT, com foco em movimento para iniciantes e hábitos saudáveis. Use identidade verde, páginas Sobre e Contato e categorias Movimento e Bem-estar. Prepare textos atemporais em rascunho.",
    references: [],
  });
  console.log(
    JSON.stringify({
      check: "Gemini real",
      status: "PASS",
      model: result.model,
      categories: result.plan.categories.length,
      sections: result.plan.sections.length,
      pages: result.plan.pages.length,
      articles: result.plan.articles.length,
    }),
  );
} catch (error) {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API ||
    process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const probe = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Responda apenas OK." }] }],
        generationConfig: { maxOutputTokens: 256 },
      }),
    },
  );
  const detail = await probe.json().catch(() => null);
  console.log(
    JSON.stringify({
      check: "Gemini minimal",
      status: probe.status,
      reason: String(detail?.error?.message || "")
        .replaceAll(key, "[REDACTED]")
        .replace(/AIza[\w-]+/g, "[REDACTED]")
        .slice(0, 1000),
    }),
  );
  console.error(
    JSON.stringify({
      check: "Gemini real",
      status: "FAIL",
      code: error.code || "unknown",
      diagnostic: error.diagnostic,
      validation: error.validation,
      message: error.code ? error.message : "Falha ao validar a geração.",
    }),
  );
  process.exitCode = 1;
}
