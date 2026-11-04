// Optional authenticated release verification; all test data is disposable.
// Never logs credentials, session tokens, invite links or generated mail.
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  origin = process.env.APP_URL,
  ref = new URL(url).hostname.split(".")[0],
  suffix = randomUUID().slice(0, 8);
let admin,
  organizationId,
  users = [],
  uploadedPaths = [],
  stage = "setup";
const check = (condition, label) => {
  if (!condition) throw new Error(label);
};
try {
  const headers = {
    Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
  };
  const keyResponse = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/api-keys`,
    { headers },
  );
  check(keyResponse.ok, "Administrative service unavailable");
  const keys = await keyResponse.json();
  const service = (Array.isArray(keys) ? keys : keys.keys || []).find(
    (k) => k.name === "service_role",
  );
  check(service?.api_key, "Server credential unavailable");
  admin = createClient(url, service.api_key, {
    auth: { persistSession: false },
  });
  const ownerEmail = `release-owner-${suffix}@example.test`,
    editorEmail = `release-editor-${suffix}@example.test`,
    password = randomBytes(32).toString("base64url");
  for (const email of [ownerEmail, editorEmail]) {
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    check(!user.error, "Temporary account failed");
    users.push(user.data.user.id);
  }
  const org = await admin
    .from("organizations")
    .insert({ name: `Release verification ${suffix}` })
    .select("id")
    .single();
  check(!org.error, "Temporary organization failed");
  organizationId = org.data.id;
  await admin
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: users[0] });
  const portals = await admin
    .from("portals")
    .insert([
      {
        organization_id: organizationId,
        name: "Visual verification",
        slug: `release-${suffix}`,
        template: "daily",
        settings: { color: "#c4170c" },
      },
      {
        organization_id: organizationId,
        name: "Restricted verification",
        slug: `restricted-${suffix}`,
        template: "classic",
        settings: {},
      },
    ])
    .select("id,slug");
  check(!portals.error, "Portal setup failed");
  const one = portals.data.find((p) => p.slug === `release-${suffix}`).id,
    two = portals.data.find((p) => p.id !== one).id;
  const invitation = await admin
    .from("portal_editors")
    .insert({
      organization_id: organizationId,
      portal_id: one,
      email: editorEmail,
    });
  check(!invitation.error, "Editor invitation failed");
  const cookies = new Map();
  const editor = createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) => values.forEach((v) => cookies.set(v.name, v.value)),
      },
    },
  );
  stage = "passwordless access";
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: editorEmail,
  });
  check(!link.error, "One-time link failed");
  const session = await editor.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink",
  });
  check(!session.error, "Passwordless confirmation failed");
  const claim = await editor.rpc("claim_portal_invitations");
  check(!claim.error, "Invitation acceptance failed");
  const cookieHeader = () => ({
    Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  });
  stage = "portal isolation";
  const own = await fetch(`${origin}/painel/${one}`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  check(own.status === 200, "Assigned portal denied");
  const other = await fetch(`${origin}/painel/${two}`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  check(other.status === 404, "Other portal exposed");
  stage = "visual settings";
  const update = await editor
    .from("portals")
    .update({
      settings: { color: "#c4170c" },
      home_published: [
        {
          id: randomUUID(),
          type: "text",
          title: "Release verification",
          text: "Temporary visual verification.",
        },
      ],
      template: "daily",
    })
    .eq("id", one)
    .select("id");
  check(!update.error && update.data?.length === 1, "Visual save failed");
  const draft = await editor.rpc("get_home_draft", { target: one });
  check(!draft.error, "Draft access failed");
  const forbidden = await editor
    .from("portals")
    .update({ name: "Forbidden" })
    .eq("id", two)
    .select("id");
  check(
    !forbidden.error && forbidden.data.length === 0,
    "Out-of-scope update permitted",
  );
  stage = "editor media";
  const path = `${organizationId}/${one}/${randomUUID()}.webp`,
    bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#c4170c" },
    })
      .webp()
      .toBuffer();
  const uploaded = await editor.storage
    .from("portal-media")
    .upload(path, bytes, { contentType: "image/webp" });
  check(!uploaded.error, "Editor media upload denied");
  uploadedPaths.push(path);
  const imageUrl = editor.storage.from("portal-media").getPublicUrl(path)
    .data.publicUrl;
  const media = await editor
    .from("media")
    .insert({
      organization_id: organizationId,
      portal_id: one,
      path,
      url: imageUrl,
      name: "Release verification",
      size: bytes.length,
    });
  check(!media.error, "Editor media save denied");
  stage = "domain registration";
  const domain = await editor
    .from("domains")
    .insert({
      organization_id: organizationId,
      portal_id: one,
      hostname: `release-${suffix}.example.test`,
    });
  check(!domain.error, "Domain registration denied");
  const domains = await fetch(`${origin}/painel/${one}/dominios`, {
    headers: cookieHeader(),
  });
  const domainHtml = await domains.text();
  check(
    domains.status === 200 &&
      !/Configure.*Supabase|projeto Vercel|VERCEL_API_TOKEN/.test(domainHtml),
    "Technical details exposed",
  );
  stage = "theme";
  const publicPage = await fetch(`${origin}/p/release-${suffix}`);
  check(
    publicPage.ok && (await publicPage.text()).includes("reference-site daily"),
    "Daily theme unavailable",
  );
  stage = "revoke editor";
  await admin.from("portal_editors").delete().eq("portal_id", one);
  const revoked = await fetch(`${origin}/painel/${one}`, {
    headers: cookieHeader(),
    redirect: "manual",
  });
  check(
    revoked.status === 307 &&
      revoked.headers.get("location")?.includes("/login"),
    "Revoked editor retained access",
  );
  const config = await (
    await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
      headers,
    })
  ).json();
  check(
    config.disable_signup === true &&
      config.uri_allow_list?.includes(`${origin}/auth/callback`),
    "Email callback configuration mismatch",
  );
  console.log(
    JSON.stringify({
      check: "Editorial release",
      status: "PASS",
      passwordless: true,
      portalIsolation: true,
      editorMedia: true,
      dailyTheme: true,
      domainsRegistered: true,
      domainActivation: "requires server authorization",
      customEmailDeliveryConfigured: !!config.smtp_host,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      check: "Editorial release",
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
    if (media.data?.length || uploadedPaths.length) {
      const r = await admin.storage
        .from("portal-media")
        .remove([...new Set([...(media.data||[]).map((m) => m.path),...uploadedPaths])]);
      if (r.error) clean = false;
    }
    const r = await admin
      .from("organizations")
      .delete()
      .eq("id", organizationId);
    if (r.error) clean = false;
  }
  if (admin)
    for (const id of users) {
      const r = await admin.auth.admin.deleteUser(id);
      if (r.error) clean = false;
    }
  console.log(
    JSON.stringify({
      check: "Editorial release cleanup",
      status: clean ? "PASS" : "FAIL",
    }),
  );
  if (!clean) process.exitCode = 1;
}
