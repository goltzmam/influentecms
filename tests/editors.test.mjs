import { test } from "node:test";
import assert from "node:assert/strict";
import { aiDatabase } from "./helpers/ai-database.mjs";
test("Editor confirma o próprio e-mail e administra apenas o portal atribuído", async () => {
  const db = await aiDatabase();
  const owner = "00000000-0000-4000-8000-000000000001",
    editor = "00000000-0000-4000-8000-000000000002",
    org = "00000000-0000-4000-8000-000000000003",
    one = "00000000-0000-4000-8000-000000000004",
    two = "00000000-0000-4000-8000-000000000005";
  try {
    await db.exec(
      `grant all on storage.objects to authenticated;insert into auth.users values('${owner}'),('${editor}');insert into organizations(id,name) values('${org}','Equipe');insert into organization_members(organization_id,user_id) values('${org}','${owner}');insert into portals(id,organization_id,name,slug,template) values('${one}','${org}','Um','um','daily'),('${two}','${org}','Dois','dois','classic');set role authenticated;set request.jwt.claim.sub='${owner}';insert into portal_editors(organization_id,portal_id,email)values('${org}','${one}','editor@example.test');reset role;set role authenticated;set request.jwt.claim.sub='${editor}';set request.jwt.claims='{"email":"other@example.test"}';select claim_portal_invitations();`,
    );
    assert.equal(
      (await db.query("select is_portal_editor($1) as allowed", [one])).rows[0]
        .allowed,
      false,
    );
    await db.exec(
      `set request.jwt.claims='{"email":"editor@example.test"}';select claim_portal_invitations();`,
    );
    assert.equal(
      (await db.query("select is_portal_editor($1) as allowed", [one])).rows[0]
        .allowed,
      true,
    );
    await db.query(
      "update portals set name='Editado',design_draft=$2 where id=$1",
      [one, '{"template":"daily"}'],
    );
    await db.query("select get_home_draft($1)", [one]);
    await db.query("select get_home_design($1)", [one]);
    await assert.rejects(
      db.query("select get_home_draft($1)", [two]),
      /Forbidden/,
    );
    assert.equal(
      (
        await db.query(
          "update portals set name='Negado' where id=$1 returning id",
          [two],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into portal_editors(organization_id,portal_id,email)values($1,$2,$3)",
        [org, two, "attacker@example.test"],
      ),
    );
    await assert.rejects(
      db.query(
        "insert into categories(organization_id,portal_id,name,slug)values($1,$2,'Negada','negada')",
        [org, two],
      ),
    );
    await db.query(
      "insert into storage.objects(bucket_id,name)values('portal-media',$1)",
      [`${org}/${one}/image.webp`],
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name)values('portal-media',$1)",
        [`${org}/${two}/forbidden.webp`],
      ),
    );
    await db.query(
      "insert into categories(organization_id,portal_id,name,slug)values($1,$2,'Permitida','permitida')",
      [org, one],
    );
    await assert.rejects(
      db.query("update portal_editors set user_id=$1", [editor]),
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${owner}';delete from portal_editors where portal_id='${one}';reset role;set role authenticated;set request.jwt.claim.sub='${editor}';`,
    );
    assert.equal(
      (await db.query("select is_portal_editor($1) as allowed", [one])).rows[0]
        .allowed,
      false,
    );
    await assert.rejects(db.query("select get_home_design($1)", [one]));
  } finally {
    await db.close();
  }
});
