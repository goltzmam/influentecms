import sharp from "sharp";
// Optional live release check. Uses a disposable owner, never the real account.
// No credentials, prompts from users, generated copy or session tokens are logged.
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
const origin = (
  process.env.APP_URL || "https://influentecms.vercel.app"
).replace(/\/$/, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  ref = new URL(url).hostname.split(".")[0];
let admin,
  organizationId,
  userId,
  stage = "setup";
function check(ok, label) {
  if (!ok) throw new Error(label);
}
try {
  const keysResponse = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/api-keys`,
    {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
    },
  );
  check(keysResponse.ok, "Administrative API unavailable");
  const keys = await keysResponse.json();
  const service = (Array.isArray(keys) ? keys : keys.keys || []).find(
    (k) => k.name === "service_role",
  );
  check(service?.api_key, "Server credential unavailable");
  admin = createClient(url, service.api_key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = randomUUID().slice(0, 8),
    email = `flue-check-${suffix}@example.test`,
    password = randomBytes(32).toString("base64url");
  const user = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  check(!user.error && user.data?.user, "Temporary identity failed");
  userId = user.data.user.id;
  const org = await admin
    .from("organizations")
    .insert({ name: `FLUE release check ${suffix}` })
    .select("id")
    .single();
  check(!org.error, "Temporary organization failed");
  organizationId = org.data.id;
  const member = await admin
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: userId });
  check(!member.error, "Temporary membership failed");
  const cookies = new Map();
  const owner = createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (items) =>
          items.forEach((item) => cookies.set(item.name, item.value)),
      },
    },
  );
  const login = await owner.auth.signInWithPassword({ email, password });
  check(!login.error, "Temporary login failed");
  const headers = {
    Origin: origin,
    "Content-Type": "application/json",
    Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
  };
  stage = "FLUE interface";
  const ui = await fetch(origin + "/painel/ia", { headers });
  const html = await ui.text();
  check(
    ui.status === 200 &&
      html.includes("ESTÚDIO FLUE") &&
      !/Gemini conectado|ESTÚDIO GEMINI/.test(html),
    "FLUE interface mismatch",
  );
  const screenshot = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000"><rect width="1200" height="1000" fill="#f8fbf8"/><rect width="1200" height="130" fill="#24543e"/><rect x="50" y="30" width="240" height="50" rx="12" fill="#dceba2"/><rect x="50" y="180" width="730" height="350" rx="18" fill="#173b2b"/><rect x="820" y="180" width="330" height="210" rx="18" fill="#e4efbc"/><rect x="820" y="420" width="330" height="180" rx="18" fill="#edf2ed"/><rect x="50" y="580" width="730" height="70" rx="10" fill="#dceba2"/><rect x="50" y="680" width="730" height="120" rx="12" fill="#e6eee8"/><rect y="850" width="1200" height="150" fill="#142b20"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  stage = "generation";
  const generated = await fetch(origin + "/api/ai/portals/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      brief:
        "Crie um portal editorial de fitness chamado SaudeFIT, com foco em movimento para iniciantes e hábitos saudáveis, páginas Sobre e Contato e textos atemporais em rascunho. Use a captura anexada como referência de paleta verde e composição. Configure design com menu híbrido, formulário compacto de 420 px, rodapé com chamada comercial https://example.com/anuncie e cartões de parceiros. Separe cores dos títulos e copy por seção.",
      references: [],
      requireReferences: true,
      referenceImages: [
        { mimeType: "image/png", data: screenshot.toString("base64") },
      ],
    }),
    signal: AbortSignal.timeout(270000),
  });
  const project = await generated.json();
  check(
    generated.ok,
    `Generation HTTP ${generated.status}: ${project.code || "failed"}`,
  );
  check(
    project.jobId && project.plan?.categories?.length >= 2,
    "Generated structure missing",
  );
  check(!("model" in project), "Provider leaked in response");
  check(
    project.plan.design?.navigation && project.plan.design?.contact,
    "Editable visual design missing",
  );
  const plan = project.plan,
    i = plan.identity;
  stage = "creation";
  const created = await fetch(origin + "/api/ai/portals/create", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jobId: project.jobId,
      publishArticles: false,
      edits: {
        name: plan.name,
        slug: `flue-check-${suffix}`,
        template: plan.template,
        color: i.color,
        accentColor: i.accentColor,
        surfaceColor: i.surfaceColor,
        textColor: i.textColor,
        tagline: i.tagline,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const result = await created.json();
  check(created.ok && result.portalId, `Creation HTTP ${created.status}`);
  const portal = await admin
    .from("portals")
    .select("settings")
    .eq("id", result.portalId)
    .single();
  check(portal.data?.settings?.logo, "Brand asset missing");
  const articles = await admin
    .from("articles")
    .select("status")
    .eq("portal_id", result.portalId);
  check(
    !articles.error && articles.data.every((a) => a.status === "draft"),
    "Draft status mismatch",
  );
  stage = "public portal";
  const published = await fetch(origin + `/p/flue-check-${suffix}`);
  check(published.ok, "Public portal unavailable");
  console.log(
    JSON.stringify({
      check: "FLUE live authenticated flow",
      status: "PASS",
      references: project.references.map((r) => r.status),
      screenshotReference: true,
      editableExperience: !!plan.design,
      categories: plan.categories.length,
      sections: plan.sections.length,
      pages: plan.pages.length,
      articles: plan.articles.length,
      editablePortal: true,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      check: "FLUE live authenticated flow",
      status: "FAIL",
      stage,
      message: error.message,
    }),
  );
  process.exitCode = 1;
} finally {
  let clean = true;
  if (admin && organizationId) {
    const media = await admin
      .from("media")
      .select("path")
      .eq("organization_id", organizationId);
    if (media.data?.length) {
      const removed = await admin.storage
        .from("portal-media")
        .remove(media.data.map((m) => m.path));
      if (removed.error) clean = false;
    }
    const deleted = await admin
      .from("organizations")
      .delete()
      .eq("id", organizationId);
    if (deleted.error) clean = false;
  }
  if (admin && userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) clean = false;
  }
  console.log(
    JSON.stringify({
      check: "FLUE disposable data cleanup",
      status: clean ? "PASS" : "FAIL",
    }),
  );
  if (!clean) process.exitCode = 1;
}
