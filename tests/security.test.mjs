import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { cleanHtml, isLive, safeLink } from "../src/lib/content.ts";
import {
  articleSchema,
  domainSchema,
  sectionsSchema,
} from "../src/lib/validation.ts";
const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  a: "00000000-0000-4000-8000-000000000003",
  b: "00000000-0000-4000-8000-000000000004",
  pa: "00000000-0000-4000-8000-000000000005",
  pb: "00000000-0000-4000-8000-000000000006",
};
test("Sanitização remove execução, protocolos perigosos e vídeos externos", () => {
  const clean = cleanHtml(
    '<script>alert(1)</script><p onclick="alert(1)">Texto</p><img src="https://cdn.example/a.jpg" onerror="alert(1)"><a href="javascript:alert(1)">link</a><iframe src="https://evil.example"></iframe><iframe src="https://www.youtube-nocookie.com/embed/x"></iframe>',
  );
  assert.ok(!clean.includes("script"));
  assert.ok(!clean.includes("onclick"));
  assert.ok(!clean.includes("onerror"));
  assert.ok(!clean.includes("javascript"));
  assert.ok(!clean.includes("evil.example"));
  assert.ok(clean.includes("youtube-nocookie.com"));
  assert.ok(clean.includes("<p>Texto</p>"));
  assert.equal(safeLink("//evil.example"), "#");
  assert.equal(safeLink("javascript:alert(1)"), "#");
  assert.equal(safeLink("/categoria/brasil"), "/categoria/brasil");
});
test("Publicação depende do status e da data; validação rejeita conteúdo inconsistente", () => {
  assert.equal(isLive("draft", "2020-01-01"), false);
  assert.equal(isLive("scheduled", "2099-01-01"), false);
  assert.equal(isLive("scheduled", "2020-01-01"), true);
  assert.equal(domainSchema.safeParse("https://example.com").success, false);
  assert.equal(domainSchema.safeParse("noticias.com.br").success, true);
  assert.equal(
    sectionsSchema.safeParse([{ id: ids.pa, type: "script", title: "" }])
      .success,
    false,
  );
  assert.equal(
    articleSchema.safeParse({
      title: "Título",
      slug: "titulo",
      subtitle: "",
      content: "",
      author: "Redação",
      cover_url: "",
      cover_alt: "",
      tags: [],
      category_id: null,
      seo_title: "",
      seo_description: "",
      status: "scheduled",
      publish_at: null,
    }).success,
    false,
  );
});
test("Migrations, RLS, referências cruzadas, domínio e publicação pública", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 grant usage on schema auth,public,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 grant select,insert,delete on storage.objects to authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611030001_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611030002_editorial.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611030003_audience.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users values('${ids.owner}'),('${ids.other}');
 insert into organizations(id,name) values('${ids.a}','A'),('${ids.b}','B');
 insert into organization_members(organization_id,user_id) values('${ids.a}','${ids.owner}'),('${ids.b}','${ids.other}');
 insert into portals(id,organization_id,name,slug) values('${ids.pa}','${ids.a}','A','a'),('${ids.pb}','${ids.b}','B','b');
 insert into articles(organization_id,portal_id,title,slug,status,publish_at) values
 ('${ids.a}','${ids.pa}','Publicada','publicada','published',now()-interval '1 hour'),
 ('${ids.a}','${ids.pa}','Rascunho A','rascunho','draft',null),
 ('${ids.a}','${ids.pa}','Agendada','agendada','scheduled',now()+interval '1 day'),
 ('${ids.b}','${ids.pb}','Rascunho B','rascunho','draft',null);
 set role authenticated; set request.jwt.claim.sub='${ids.owner}';`);
    await t.test(
      "Proprietário vê apenas sua associação e seus rascunhos",
      async () => {
        assert.equal(
          (await db.query("select * from organization_members")).rows.length,
          1,
        );
        assert.equal(
          (await db.query("select * from organizations")).rows.length,
          1,
        );
        assert.equal(
          (await db.query("select title from articles")).rows.length,
          3,
        );
        const updated = await db.query(
          `update portals set name='INVASÃO' where id='${ids.pb}' returning id`,
        );
        assert.equal(updated.rows.length, 0);
        await assert.rejects(
          db.exec(
            `insert into articles(organization_id,portal_id,title,slug) values('${ids.b}','${ids.pb}','Inválida','invadida')`,
          ),
        );
        await assert.rejects(
          db.exec(
            `insert into articles(organization_id,portal_id,title,slug) values('${ids.a}','${ids.pb}','Inválida','cruzada')`,
          ),
        );
        await assert.rejects(db.query(`select get_home_draft('${ids.pb}')`));
        await assert.rejects(
          db.exec(
            `insert into organization_members values('${ids.b}','${ids.owner}','owner')`,
          ),
        );
      },
    );
    await t.test(
      "Cliente não pode verificar domínio nem consultar rascunho público",
      async () => {
        await assert.rejects(
          db.exec(
            `insert into domains(organization_id,portal_id,hostname,verified) values('${ids.a}','${ids.pa}','example.com',true)`,
          ),
        );
        await db.exec(
          `insert into domains(organization_id,portal_id,hostname) values('${ids.a}','${ids.pa}','example.com')`,
        );
        await assert.rejects(db.exec(`update domains set verified=true`));
        await assert.rejects(db.query("select home_draft from portals"));
        assert.deepEqual(
          (await db.query(`select get_home_draft('${ids.pa}') as draft`))
            .rows[0].draft,
          [],
        );
      },
    );
    await t.test("Storage rejeita uploads em outro portal", async () => {
      await db.exec(
        `insert into storage.objects(bucket_id,name) values('portal-media','${ids.a}/${ids.pa}/image.webp')`,
      );
      await assert.rejects(
        db.exec(
          `insert into storage.objects(bucket_id,name) values('portal-media','${ids.b}/${ids.pb}/image.webp')`,
        ),
      );
    });
    await db.exec("reset role; set request.jwt.claim.sub=''; set role anon;");
    await t.test(
      "Visitante só lê notícia publicada e não vê membros ou domínio pendente",
      async () => {
        const visible = await db.query("select title from articles");
        assert.deepEqual(
          visible.rows.map((r) => r.title),
          ["Publicada"],
        );
        assert.equal(
          (await db.query("select hostname from domains")).rows.length,
          0,
        );
        await assert.rejects(db.query("select * from organization_members"));
        await assert.rejects(db.query("select * from portal_contacts"));
        await assert.rejects(db.query("select * from portal_subscribers"));
        await db.query(
          `select subscribe_portal('${ids.pa}','reader@example.test')`,
        );
        await db.query(
          `select subscribe_portal('${ids.pa}','reader@example.test')`,
        );
        await assert.rejects(
          db.query(`select subscribe_portal('${ids.pa}','invalid-email')`),
        );
        await db.query(
          `select submit_portal_contact('${ids.pa}','Leitor','reader@example.test','','','','Teste','Sugestão','Mensagem longa de teste')`,
        );
        await assert.rejects(
          db.query(
            `select submit_portal_contact('${ids.pa}','Leitor','reader@example.test','','','','Teste','Sugestão','curta')`,
          ),
        );
        await assert.rejects(db.query("select home_draft from portals"));
        await assert.rejects(
          db.exec(
            `insert into portals(organization_id,name,slug) values('${ids.a}','X','x')`,
          ),
        );
      },
    );
  } finally {
    await db.close();
  }
});

test("Logout valida a origem pelo host real mesmo com URL normalizada pelo servidor", async () => {
  const { sameOrigin } = await import("../src/lib/security.ts");
  const request = (origin, host = "127.0.0.1:3100") =>
    new Request("http://localhost:3100/auth/signout", {
      method: "POST",
      headers: { origin, host },
    });
  assert.equal(sameOrigin(request("http://127.0.0.1:3100")), true);
  assert.equal(sameOrigin(request("https://attacker.example")), false);
  assert.equal(sameOrigin(request("http://127.0.0.1:3101")), false);
  assert.equal(sameOrigin(request("https://127.0.0.1:3100")), false);
  assert.equal(sameOrigin(request("null")), false);
});
