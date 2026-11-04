// HTTP rendering check only. Disposable data; never requests ads or claims Google approval.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { referenceAdSlots } from "../src/lib/advertising.ts";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  origin = (process.env.APP_URL || "https://influentecms.vercel.app").replace(
    /\/$/,
    "",
  );
let client, org;
let stage = "setup";
const check = (value, message) => {
  if (!value) throw new Error(message);
};
try {
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const ref = new URL(url).hostname.split(".")[0],
      response = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/api-keys`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          },
        },
      );
    check(response.ok, "Server authorization unavailable");
    const keys = await response.json();
    key = (Array.isArray(keys) ? keys : keys.keys || []).find(
      (k) => k.name === "service_role",
    )?.api_key;
  }
  check(key, "Server credential unavailable");
  client = createClient(url, key, { auth: { persistSession: false } });
  const suffix = randomUUID().slice(0, 8),
    organization = await client
      .from("organizations")
      .insert({ name: "Advertising release " + suffix })
      .select("id")
      .single();
  check(!organization.error, "Temporary organization failed");
  org = organization.data.id;
  const sections = [
    { id: randomUUID(), type: "lead", title: "" },
    {
      id: randomUUID(),
      type: "category",
      title: "Editoria de verificação",
      layout: "news",
    },
  ].map((s) => ({
    ...s,
    adSlots: referenceAdSlots(s.type, s.id).map((slot) => ({
      ...slot,
      showEmpty: true,
    })),
  }));
  const created = await client
    .from("portals")
    .insert({
      organization_id: org,
      name: "Verificação de apresentação",
      slug: "ad-release-" + suffix,
      template: "classic",
      settings: {
        advertising: { enabled: false },
        contactEnabled: false,
        newsletterEnabled: false,
      },
      home_draft: sections,
      home_published: sections,
    })
    .select("id,slug")
    .single();
  check(!created.error, "Temporary portal failed");
  const category = await client
    .from("categories")
    .insert({
      organization_id: org,
      portal_id: created.data.id,
      name: "Editoria de verificação",
      slug: "verificacao",
    })
    .select("id")
    .single();
  check(!category.error, "Temporary category failed");
  sections[1].categoryId = category.data.id;
  const articles = await client
    .from("articles")
    .insert(
      Array.from({ length: 10 }, (_, i) => ({
        organization_id: org,
        portal_id: created.data.id,
        category_id: category.data.id,
        title: "Verificação editorial temporária " + i,
        slug: "verificacao-" + i,
        status: "published",
        publish_at: new Date(Date.now() - 60000).toISOString(),
        content: "<p>Conteúdo temporário de validação de apresentação.</p>",
      })),
    );
  check(!articles.error, "Temporary content failed");
  for (const template of ["classic", "modern", "daily"]) {
    stage = template;
    const saved = await client
      .from("portals")
      .update({ template, home_draft: sections, home_published: sections })
      .eq("id", created.data.id);
    check(!saved.error, "Theme save failed");
    const page = await fetch(`${origin}/p/${created.data.slug}`),
      html = await page.text();
    check(page.ok, "Public portal unavailable");
    check(html.includes(`reference-site ${template}`), "Wrong theme");
    for (const role of ["advertising", "google", "sponsor"])
      check(html.includes("slot-kind-" + role), "Advertising role missing");
    const txt = await fetch(`${origin}/p/${created.data.slug}/ads.txt`);
    check(txt.status === 404, "Unconfigured Google publisher exposed");
  }
  console.log(
    JSON.stringify({
      check: "Shared advertising release",
      status: "PASS",
      themes: 3,
      roles: 3,
      realPortalRendering: true,
      googleAdsRequested: false,
      googleApprovalTested: false,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      check: "Shared advertising release",
      status: "FAIL",
      stage,
      message: error instanceof Error ? error.message : "Unavailable",
    }),
  );
  process.exitCode = 1;
} finally {
  let clean = true;
  if (client && org) {
    const removed = await client.from("organizations").delete().eq("id", org);
    if (removed.error) clean = false;
  }
  console.log(
    JSON.stringify({
      check: "Advertising release cleanup",
      status: clean ? "PASS" : "FAIL",
    }),
  );
  if (!clean) process.exitCode = 1;
}
