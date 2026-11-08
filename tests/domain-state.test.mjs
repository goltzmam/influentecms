import { test } from "node:test";
import assert from "node:assert/strict";
import { domainRecords, resolveDomain } from "../src/lib/domain-state.ts";
test("DNS mostra host e destino corretos, preferindo apenas os registros de maior prioridade", () => {
  const status = {
    apexName: "example.com",
    recommendedCNAME: [
      { rank: 2, value: "old.example.net" },
      { rank: 1, value: "site.example.net" },
    ],
    recommendedIPv4: [{ rank: 1, value: ["192.0.2.1", "192.0.2.2"] }],
  };
  assert.deepEqual(domainRecords("example.com", status), [
    { type: "A", name: "@", value: "192.0.2.1" },
    { type: "A", name: "@", value: "192.0.2.2" },
  ]);
  assert.deepEqual(domainRecords("news.example.com", status), [
    { type: "CNAME", name: "news", value: "site.example.net" },
  ]);
  assert.deepEqual(
    domainRecords("www.example.com", {
      ...status,
      verification: [
        {
          type: "TXT",
          domain: "_verify.example.com",
          value: "ownership-proof",
        },
      ],
    }),
    [
      { type: "TXT", name: "_verify.example.com", value: "ownership-proof" },
      { type: "CNAME", name: "www", value: "site.example.net" },
    ],
  );
});
test("Conexão é idempotente e mantém DNS pendente após tentativa de verificação sem TXT", async () => {
  const calls = [];
  const api = async (path, options) => {
    calls.push({ path, options });
    if (path.includes("/config?"))
      return {
        misconfigured: true,
        recommendedCNAME: [{ rank: 1, value: "site.example.net" }],
      };
    if (path.endsWith("/verify")) return null;
    if (options?.method === "POST")
      return {
        name: "news.example.com",
        projectId: "prj_test",
        apexName: "example.com",
        verified: false,
        verification: [
          { type: "TXT", domain: "_verify.example.com", value: "proof" },
        ],
      };
    return null;
  };
  const state = await resolveDomain("news.example.com", "prj_test", api);
  assert.equal(state.verified, false);
  assert.equal(state.provider_status.verification.length, 1);
  assert.equal(state.provider_status.recommendedCNAME.length, 1);
  assert.ok(calls.at(-1).path.includes("projectIdOrName=prj_test"));
});
test("Domínio só conecta com projeto, hostname, propriedade e DNS confirmados", async () => {
  for (const [verified, misconfigured, expected] of [
    [true, false, true],
    [true, true, false],
    [false, false, false],
  ]) {
    const state = await resolveDomain(
      "news.example.com",
      "prj_test",
      async (path) =>
        path.includes("/config?")
          ? { misconfigured }
          : path.endsWith("/verify")
            ? null
            : { name: "news.example.com", projectId: "prj_test", verified },
    );
    assert.equal(state.verified, expected);
  }
  await assert.rejects(
    () =>
      resolveDomain("news.example.com", "prj_test", async () => ({
        name: "news.example.com",
        projectId: "prj_other",
        verified: true,
      })),
    /não está associado/,
  );
});

test("Verificação parcial de propriedade preserva associação e recomendações do domínio", async () => {
  const result = await resolveDomain(
    "news.example.com",
    "prj_test",
    async (path) =>
      path.endsWith("/verify")
        ? { verified: true }
        : path.includes("/config?")
          ? {
              misconfigured: false,
              recommendedCNAME: [{ rank: 1, value: "target.example.net" }],
            }
          : {
              name: "news.example.com",
              projectId: "prj_test",
              apexName: "example.com",
              verified: false,
            },
  );
  assert.equal(result.verified, true);
  assert.equal(result.provider_status.apexName, "example.com");
});
