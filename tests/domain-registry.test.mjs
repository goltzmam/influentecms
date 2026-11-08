import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { aiDatabase } from "./helpers/ai-database.mjs";
import { portalUrl } from "../src/lib/portal-url.ts";
test("Ver portal usa apenas domínio confirmado vinculado ao portal e mantém endereço provisório durante DNS", () => {
  const p = { id: "p", slug: "meu-portal" };
  assert.equal(
    portalUrl(p, [
      { hostname: "livre.com.br", verified: true, portal_id: null },
      { hostname: "outro.com.br", verified: true, portal_id: "other" },
      { hostname: "pendente.com.br", verified: false, portal_id: "p" },
    ]),
    "/p/meu-portal",
  );
  assert.equal(
    portalUrl(p, [{ hostname: "meu.com.br", verified: true, portal_id: "p" }]),
    "https://meu.com.br",
  );
  assert.equal(
    portalUrl(p, [
      { hostname: "javascript:evil", verified: true, portal_id: "p" },
    ]),
    "/p/meu-portal",
  );
  assert.equal(
    portalUrl(p, [
      { hostname: "influentecms.vercel.app", verified: true, portal_id: "p" },
    ]),
    "/p/meu-portal",
  );
});
test("Central isola organizações, evita domínio duplicado em portais, transfere e preserva cadastro ao excluir portal", async () => {
  const db = await aiDatabase();
  const [
    owner,
    other,
    editor,
    org,
    foreignOrg,
    p1,
    p2,
    foreign,
    domain,
    foreignDomain,
  ] = Array.from({ length: 10 }, () => randomUUID());
  try {
    await db.exec(
      `insert into auth.users values('${owner}'),('${other}'),('${editor}');insert into organizations(id,name)values('${org}','A'),('${foreignOrg}','B');insert into organization_members(organization_id,user_id)values('${org}','${owner}'),('${foreignOrg}','${other}');insert into portals(id,organization_id,name,slug)values('${p1}','${org}','Um','um'),('${p2}','${org}','Dois','dois'),('${foreign}','${foreignOrg}','Outro','outro');insert into portal_editors(organization_id,portal_id,user_id,email)values('${org}','${p1}','${editor}','editor@example.test');insert into domains(id,organization_id,portal_id,hostname,verified)values('${domain}','${org}',null,'disponivel.example.com',true),('${foreignDomain}','${foreignOrg}',null,'outro.example.com',true);set role anon;`,
    );
    assert.equal(
      (await db.query("select count(*)::int n from domains")).rows[0].n,
      0,
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${owner}';`,
    );
    assert.equal(
      (await db.query("select count(*)::int n from domains")).rows[0].n,
      1,
    );
    await db.query("select assign_portal_domain($1,$2,false)", [domain, p1]);
    assert.equal(
      (
        await db.query("select resolve_portal_hostname($1,null) slug", [
          "disponivel.example.com",
        ])
      ).rows[0].slug,
      "um",
    );
    await assert.rejects(
      db.query("select assign_portal_domain($1,$2,false)", [domain, p2]),
      /domain_in_use/,
    );
    await assert.rejects(
      db.query("select assign_portal_domain($1,$2,true)", [foreignDomain, p1]),
      /domain_unavailable/,
    );
    await assert.rejects(
      db.query("select assign_portal_domain($1,$2,true)", [domain, foreign]),
      /portal_unavailable/,
    );
    await assert.rejects(
      db.query("select create_portal_with_domain($1,$2,$3,$4,$5)", [
        "Tentativa",
        "tentativa",
        "classic",
        "{}",
        domain,
      ]),
      /domain_in_use/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from portals where slug='tentativa'",
        )
      ).rows[0].n,
      0,
    );
    await db.exec(`set request.jwt.claim.sub='${editor}';`);
    await assert.rejects(
      db.query("select assign_portal_domain($1,$2,true)", [domain, p2]),
      /domain_unavailable/,
    );
    await db.query("select release_portal_domain($1)", [domain]);
    await db.exec(`set request.jwt.claim.sub='${owner}';`);
    await db.query("select assign_portal_domain($1,$2,false)", [domain, p1]);
    await db.query("select assign_portal_domain($1,$2,true)", [domain, p2]);
    await db.query("delete from portals where id=$1", [p2]);
    const row = (
      await db.query("select portal_id,verified from domains where id=$1", [
        domain,
      ])
    ).rows[0];
    assert.equal(row.portal_id, null);
    assert.equal(
      (
        await db.query("select resolve_portal_hostname($1,null) slug", [
          "disponivel.example.com",
        ])
      ).rows[0].slug,
      null,
    );
    assert.equal(
      (
        await db.query("select resolve_portal_hostname($1,$2) slug", [
          "um.portais.example.com",
          "portais.example.com",
        ])
      ).rows[0].slug,
      "um",
    );
    assert.equal(row.verified, true);
    const created = (
      await db.query("select create_portal_with_domain($1,$2,$3,$4,$5) id", [
        "Novo",
        "novo",
        "daily",
        "{}",
        domain,
      ])
    ).rows[0].id;
    assert.equal(
      (await db.query("select portal_id from domains where id=$1", [domain]))
        .rows[0].portal_id,
      created,
    );
    await db.exec(`reset role;delete from organizations where id='${org}'`);
    assert.equal(
      (
        await db.query("select count(*)::int n from domains where id=$1", [
          domain,
        ])
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
