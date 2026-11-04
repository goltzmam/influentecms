import { test } from "node:test";
import assert from "node:assert/strict";
import { blueprint } from "./fixtures/ai-blueprint.mjs";
import {
  blueprintSchema,
  briefSchema,
  creationPayload,
  personalize,
} from "../src/lib/ai/schema.ts";
import { generateBlueprint, AiError } from "../src/lib/ai/gemini.ts";
import { aiDatabase } from "./helpers/ai-database.mjs";
const copy = () => structuredClone(blueprint);
test("IA valida briefing, URLs públicas e referências internas do plano", () => {
  assert.equal(
    briefSchema.safeParse({ brief: "portal", references: [] }).success,
    false,
  );
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://localhost",
    "https://host.internal",
    "https://user:password@example.com",
    "https://example.com?api_key=private",
  ])
    assert.equal(
      briefSchema.safeParse({
        brief: "Crie um portal editorial de fitness e movimento.",
        references: [url],
      }).success,
      false,
      url,
    );
  assert.equal(
    briefSchema.safeParse({
      brief: "Crie um portal editorial de fitness e movimento.",
      references: ["https://example.com/noticias"],
    }).success,
    true,
  );
  const invalid = copy();
  invalid.sections[1].categorySlug = "inexistente";
  assert.equal(blueprintSchema.safeParse(invalid).success, false);
  const duplicates = copy();
  duplicates.categories.push({ ...duplicates.categories[0] });
  assert.equal(blueprintSchema.safeParse(duplicates).success, false);
});
test("Plano vira conteúdo escapado e links internos editáveis, sem executar HTML", () => {
  const input = copy();
  input.articles[0].body += "<script>alert(1)</script>";
  const payload = creationPayload(input);
  assert.ok(!payload.articles[0].content.includes("<script>"));
  assert.ok(payload.articles[0].content.includes("&lt;script&gt;"));
  assert.equal(payload.settings.menus[0].url, "/pagina/sobre");
  const edited = personalize(copy(), {
    name: "OutraMarca",
    slug: "outra-marca",
    template: "modern",
    color: "#111111",
    accentColor: "#eeeeee",
    surfaceColor: "#ffffff",
    textColor: "#121212",
    tagline: "Nova assinatura",
  });
  assert.ok(edited.pages[0].body.includes("OutraMarca"));
  assert.equal(edited.identity.color, "#111111");
});
test("Cliente Gemini usa JSON estruturado e só confirma referências com metadados de consulta", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return Response.json(
      calls.length === 1
        ? {
            candidates: [
              {
                content: {
                  parts: [{ text: "Estrutura editorial em duas colunas." }],
                },
                urlContextMetadata: {
                  urlMetadata: [
                    {
                      retrievedUrl: "https://example.com",
                      urlRetrievalStatus: "URL_RETRIEVAL_STATUS_SUCCESS",
                    },
                  ],
                },
              },
            ],
          }
        : {
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: JSON.stringify(blueprint) }] },
              },
            ],
          },
    );
  };
  const result = await generateBlueprint(
    {
      brief: "Crie um portal fitness chamado SaudeFIT.",
      references: ["https://example.com"],
    },
    { key: "test-key-not-a-secret", fetcher },
  );
  assert.equal(result.plan.name, "SaudeFIT");
  assert.equal(result.references[0].status, "retrieved");
  assert.equal(calls.length, 2);
  assert.ok(calls[0].body.tools[0].url_context);
  assert.equal(
    calls[1].body.generationConfig.responseMimeType,
    "application/json",
  );
  assert.ok(
    calls[1].body.systemInstruction.parts[0].text.includes(
      "dados não confiáveis",
    ),
  );
  assert.ok(!calls[1].url.includes("test-key"));
});
test("Falhas de cota e respostas inválidas não viram portais simulados", async () => {
  await assert.rejects(
    generateBlueprint(
      { brief: "Briefing editorial de teste.", references: [] },
      {
        key: "test-key-not-a-secret",
        fetcher: async () =>
          new Response("provider secret error", { status: 429 }),
      },
    ),
    (e) =>
      e instanceof AiError &&
      e.code === "provider_quota" &&
      !e.message.includes("secret"),
  );
  await assert.rejects(
    generateBlueprint(
      { brief: "Briefing editorial de teste.", references: [] },
      {
        key: "test-key-not-a-secret",
        fetcher: async () =>
          Response.json({
            candidates: [
              { content: { parts: [{ text: '{"name":"somente nome"}' }] } },
            ],
          }),
      },
    ),
    (e) => e instanceof AiError && e.code === "invalid_plan",
  );
  const result = await generateBlueprint(
    {
      brief: "Briefing editorial de teste.",
      references: ["https://example.com"],
      requireReferences: false,
    },
    {
      key: "test-key-not-a-secret",
      fetcher: async (_url, init) => {
        const body = JSON.parse(init.body);
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: body.tools
                      ? "Análise sem confirmação de leitura."
                      : JSON.stringify(blueprint),
                  },
                ],
              },
            },
          ],
        });
      },
    },
  );
  assert.equal(result.references[0].status, "not_retrieved");
  assert.ok(result.warnings.length);
});
test("Criação IA é atômica, idempotente, isolada e respeita rascunhos e cota", async (t) => {
  const db = await aiDatabase();
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002",
    orgA = "00000000-0000-4000-8000-000000000003",
    orgB = "00000000-0000-4000-8000-000000000004";
  try {
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');insert into organizations(id,name) values('${orgA}','A'),('${orgB}','B');insert into organization_members(organization_id,user_id) values('${orgA}','${a}'),('${orgB}','${b}');set role authenticated;set request.jwt.claim.sub='${a}';`,
    );
    const start = async () =>
      String(
        (
          await db.query("select start_portal_ai_job($1,$2,$3) as id", [
            orgA,
            "Crie um portal fitness chamado SaudeFIT.",
            [],
          ])
        ).rows[0].id,
      );
    const finish = async (id) =>
      db.query("select finish_portal_ai_job($1,$2,$3,$4,$5,false)", [
        id,
        JSON.stringify(blueprint),
        "gemini-test",
        "[]",
        "[]",
      ]);
    const payload = creationPayload(copy());
    const job = await start();
    await assert.rejects(start(), /ai_busy/);
    await finish(job);
    const create = async (id, value = payload, publish = false) =>
      db.query("select create_portal_from_ai($1,$2,$3) as id", [
        id,
        JSON.stringify(value),
        publish,
      ]);
    const first = await create(job);
    const portal = first.rows[0].id;
    await t.test("Estrutura completa e textos em rascunho", async () => {
      assert.equal((await db.query("select id from portals")).rows.length, 1);
      assert.equal((await db.query("select * from categories")).rows.length, 2);
      const articles = await db.query(
        "select status,publish_at,category_id from articles",
      );
      assert.equal(articles.rows[0].status, "draft");
      assert.equal(articles.rows[0].publish_at, null);
      assert.ok(articles.rows[0].category_id);
      assert.equal((await db.query("select * from pages")).rows.length, 1);
      assert.equal(
        (await db.query("select get_home_draft($1) as sections", [portal]))
          .rows[0].sections.length,
        4,
      );
    });
    await t.test(
      "Repetição não duplica e erro não deixa estrutura parcial",
      async () => {
        assert.equal((await create(job)).rows[0].id, portal);
        const collision = await start();
        await finish(collision);
        await assert.rejects(create(collision), /unique/);
        assert.equal((await db.query("select id from portals")).rows.length, 1);
        assert.equal(
          (await db.query("select * from categories")).rows.length,
          2,
        );
        assert.equal(
          (
            await db.query("select status from portal_ai_jobs where id=$1", [
              collision,
            ])
          ).rows[0].status,
          "ready",
        );
        const edited = { ...payload, name: "Outro", slug: "outro" };
        await create(collision, edited, true);
        assert.equal(
          (
            await db.query(
              "select count(*)::int as n from articles where status='published'",
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "Outra organização e visitante não acessam projetos privados",
      async () => {
        await db.exec(
          `reset role;set role authenticated;set request.jwt.claim.sub='${b}';`,
        );
        assert.equal(
          (await db.query("select * from portal_ai_jobs")).rows.length,
          0,
        );
        await assert.rejects(create(job), /ai_forbidden/);
        await assert.rejects(
          db.query("select start_portal_ai_job($1,$2,$3)", [
            orgA,
            "Crie um portal fitness chamado SaudeFIT.",
            [],
          ]),
          /ai_forbidden/,
        );
        await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
        await assert.rejects(db.query("select * from portal_ai_jobs"));
        await assert.rejects(create(job));
        await db.exec(
          `reset role;set role authenticated;set request.jwt.claim.sub='${a}';`,
        );
      },
    );
    await t.test(
      "Limite por organização conta também as gerações que falharam",
      async () => {
        for (let i = 0; i < 3; i++) {
          const temporary = await start();
          await db.query(
            "select finish_portal_ai_job($1,null,null,$2,$3,true)",
            [temporary, "[]", '["provider_error"]'],
          );
        }
        for (let i = 0; i < 3; i++) {
          const id = await start();
          await db.query(
            "select finish_portal_ai_job($1,null,null,$2,$3,true)",
            [id, "[]", "[]"],
          );
        }
        await assert.rejects(start(), /ai_rate_limit/);
      },
    );
  } finally {
    await db.close();
  }
});

test("Gemini repete sobrecarga transitória antes de falhar", async () => {
  let calls = 0;
  const result = await generateBlueprint(
    { brief: "Crie um portal editorial chamado SaudeFIT.", references: [] },
    {
      key: "test-key-not-a-secret",
      fetcher: async () => {
        calls++;
        return calls === 1
          ? new Response("{}", { status: 503 })
          : Response.json({
              candidates: [
                { content: { parts: [{ text: JSON.stringify(blueprint) }] } },
              ],
            });
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.plan.name, "SaudeFIT");
});

test("FLUE recupera indisponibilidade com modelo realmente listado pelo provedor", async () => {
  const calls = [];
  const result = await generateBlueprint(
    { brief: "Crie um portal editorial chamado SaudeFIT.", references: [] },
    {
      key: "test-key-not-a-secret",
      fetcher: async (url, init) => {
        calls.push(String(url));
        if (String(url).includes("/models?"))
          return Response.json({
            models: [
              {
                name: "models/gemini-test-flash",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/gemini-image-flash",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          });
        if (String(url).includes("gemini-test-flash:"))
          return Response.json({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(blueprint) }] } },
            ],
          });
        return Response.json(
          { error: { message: "Temporary overload" } },
          { status: 503 },
        );
      },
    },
  );
  assert.equal(result.model, "gemini-test-flash");
  assert.equal(result.plan.name, "SaudeFIT");
  assert.equal(calls.length, 4);
});

test("FLUE recusa referência não consultada sem autorização para ignorá-la", async () => {
  await assert.rejects(
    generateBlueprint(
      {
        brief: "Crie um portal editorial com a referência enviada.",
        references: ["https://example.com"],
      },
      {
        key: "test-key-not-a-secret",
        fetcher: async () =>
          Response.json({
            candidates: [
              {
                content: { parts: [{ text: "Sem confirmação de consulta." }] },
              },
            ],
          }),
      },
    ),
    (error) => error.code === "reference_unavailable",
  );
});
test("FLUE corrige uma estrutura inválida e envia capturas como dados visuais", async () => {
  let calls = 0;
  let captured;
  const result = await generateBlueprint(
    {
      brief: "Crie um portal editorial com base nesta captura.",
      references: [],
      referenceImages: [{ mimeType: "image/png", data: "test-base64" }],
    },
    {
      key: "test-key-not-a-secret",
      fetcher: async (_url, init) => {
        captured = JSON.parse(init.body);
        calls++;
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text:
                      calls === 1
                        ? '{"name":"incompleto"}'
                        : JSON.stringify(blueprint),
                  },
                ],
              },
            },
          ],
        });
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.plan.name, "SaudeFIT");
  assert.ok(
    captured.contents[0].parts.some(
      (part) => part.inlineData?.mimeType === "image/png",
    ),
  );
  assert.ok(captured.contents.at(-1).parts[0].text.includes("validação"));
});
