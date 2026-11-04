import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { aiDatabase } from "./helpers/ai-database.mjs";
import {
  metricBatchSchema,
  isAutomatedAgent,
} from "../src/lib/metrics/schema.ts";
import { ratio } from "../src/lib/metrics/utils.ts";
test("Métricas validam lotes anônimos e rejeitam caminhos com parâmetros ou identificadores inválidos", () => {
  const event = {
    id: randomUUID(),
    item: randomUUID(),
    kind: "campaign",
    event: "view",
    visitor: randomUUID(),
    session: randomUUID(),
    pageView: randomUUID(),
    placement: "header",
    path: "/p/portal",
    source: "direto",
    device: "desktop",
  };
  assert.ok(metricBatchSchema.safeParse({ events: [event] }).success);
  assert.equal(
    metricBatchSchema.safeParse({
      events: [{ ...event, path: "/pagina?email=private@example.test" }],
    }).success,
    false,
  );
  assert.equal(
    metricBatchSchema.safeParse({ events: Array(13).fill(event) }).success,
    false,
  );
  assert.equal(isAutomatedAgent("Googlebot/2.1"), true);
  assert.equal(isAutomatedAgent("Mozilla/5.0 Chrome"), false);
  assert.equal(ratio(10, 0), null);
});
test("Coleta deduplica views, exclui demonstrações e alvos cruzados e relatórios respeitam RLS", async () => {
  const db = await aiDatabase();
  const [
    owner,
    other,
    org,
    otherOrg,
    portal,
    foreign,
    campaign,
    partner,
    demo,
    foreignCampaign,
  ] = Array.from({ length: 10 }, () => randomUUID());
  try {
    await db.exec(
      `insert into auth.users values('${owner}'),('${other}');insert into organizations(id,name)values('${org}','Um'),('${otherOrg}','Dois');insert into organization_members(organization_id,user_id)values('${org}','${owner}'),('${otherOrg}','${other}');insert into portals(id,organization_id,name,slug,template)values('${portal}','${org}','Um','um','classic'),('${foreign}','${otherOrg}','Dois','dois','daily');insert into campaigns(id,organization_id,portal_id,name,image_url,link,position,creative)values('${campaign}','${org}','${portal}','Campanha','','','header','{}'),('${demo}','${org}','${portal}','Demo','','','header','{"demo":true}'),('${foreignCampaign}','${otherOrg}','${foreign}','Outra','','','header','{}');insert into partners(id,organization_id,portal_id,name,image_url,link)values('${partner}','${org}','${portal}','Parceiro','','');`,
    );
    const base = {
      kind: "campaign",
      item: campaign,
      visitor: "b".repeat(64),
      session: "c".repeat(64),
      pageView: randomUUID(),
      placement: "header",
      path: "/p/um",
      source: "direto",
      device: "desktop",
      value: 0,
    };
    const make = (event, patch = {}) => ({
      ...base,
      id: randomUUID(),
      event,
      ...patch,
    });
    const events = [
      make("served"),
      make("view"),
      make("view"),
      make("click"),
      make("cta"),
      make("view", { item: demo }),
      make("view", { item: foreignCampaign }),
      make("video_start"),
      make("view", { item: partner, kind: "partner", placement: "partners" }),
    ];
    await db.exec("set role service_role");
    await db.query("select record_ad_events($1,$2,$3)", [
      portal,
      "a".repeat(64),
      JSON.stringify(events),
    ]);
    await db.exec("reset role");
    assert.equal(
      (await db.query("select count(*)::integer n from ad_events")).rows[0].n,
      5,
    );
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${owner}'`,
    );
    const report = (
      await db.query(
        "select ad_metrics_report($1,now()-interval '1 day',now()+interval '1 day') r",
        [portal],
      )
    ).rows[0].r;
    assert.equal(report.totals.views, 2);
    assert.equal(report.totals.clicks, 1);
    assert.equal(report.totals.reach, 1);
    assert.equal(report.totals.video_starts, 0);
    await assert.rejects(
      db.query("insert into ad_events(id) values($1)", [randomUUID()]),
      /permission denied/,
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${other}'`,
    );
    assert.equal(
      (await db.query("select count(*)::integer n from ad_events")).rows[0].n,
      0,
    );
    await assert.rejects(
      db.query("select ad_metrics_report($1,now()-interval '1 day',now())", [
        portal,
      ]),
      /Forbidden/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select record_ad_events($1,$2,$3)", [
        portal,
        "a".repeat(64),
        "[]",
      ]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
