// Real production confirmation checks using disposable identities; no mail is sent.
// Never logs invite links, token hashes, passwords, session cookies or user content.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { confirmationLink } from "../src/lib/access-link.ts";
const origin = process.env.APP_URL || "https://influentecms.vercel.app",
  url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let admin,
  organizationId,
  stage = "setup";
const users = [];
function check(value, message) {
  if (!value) throw new Error(message);
}
try {
  const ref = new URL(url).hostname.split(".")[0];
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/api-keys`,
    {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
    },
  );
  check(response.ok, "Administrative access unavailable");
  const keys = await response.json(),
    key = (Array.isArray(keys) ? keys : keys.keys || []).find(
      (k) => k.name === "service_role",
    )?.api_key;
  check(key, "Server access unavailable");
  admin = createClient(url, key, { auth: { persistSession: false } });
  const suffix = randomUUID().slice(0, 8);
  const org = await admin
    .from("organizations")
    .insert({ name: "Access release " + suffix })
    .select("id")
    .single();
  check(!org.error, "Temporary organization failed");
  organizationId = org.data.id;
  const portals = await admin
    .from("portals")
    .insert([
      {
        organization_id: organizationId,
        name: "Assigned",
        slug: "access-" + suffix,
        template: "classic",
        settings: {},
      },
      {
        organization_id: organizationId,
        name: "Private",
        slug: "private-access-" + suffix,
        template: "modern",
        settings: {},
      },
    ])
    .select("id");
  check(!portals.error, "Temporary portals failed");
  const [one, two] = portals.data.map((p) => p.id);
  for (const kind of ["invite", "magiclink"]) {
    stage = kind + " confirmation";
    const email = `access-${kind}-${suffix}@example.test`;
    if (kind === "magiclink") {
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      check(!created.error, "Temporary identity failed");
      users.push(created.data.user.id);
    }
    const grant = await admin
      .from("portal_editors")
      .insert({ organization_id: organizationId, portal_id: one, email });
    check(!grant.error, "Temporary invitation failed");
    const generated = await admin.auth.admin.generateLink({
      type: kind,
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/painel/${one}` },
    });
    check(!generated.error, "One-time invitation failed");
    if (kind === "invite") users.push(generated.data.user.id);
    const link = confirmationLink(
      origin,
      generated.data.properties.hashed_token,
      kind,
      `/painel/${one}`,
    );
    const scanner = await fetch(link);
    check(scanner.ok, "Confirmation page unavailable");
    const input = {
      token_hash: generated.data.properties.hashed_token,
      type: kind,
      next: `/painel/${one}`,
    };
    const confirmed = await fetch(`${origin}/api/auth/confirm`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    check(confirmed.ok, "Confirmation request failed");
    const cookie = confirmed.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    check(cookie, "Session cookies missing");
    const own = await fetch(`${origin}/painel/${one}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    check(own.status === 200, "Assigned portal denied");
    const other = await fetch(`${origin}/painel/${two}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    check(other.status === 404, "Other portal exposed");
    const repeat = await fetch(`${origin}/api/auth/confirm`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    check(repeat.status === 401, "One-time token reused");
  }
  stage = "legacy session compatibility";
  const legacyEmail = `legacy-${suffix}@example.test`,
    legacyUser = await admin.auth.admin.createUser({
      email: legacyEmail,
      email_confirm: true,
    });
  check(!legacyUser.error, "Legacy identity failed");
  users.push(legacyUser.data.user.id);
  const grant = await admin
    .from("portal_editors")
    .insert({
      organization_id: organizationId,
      portal_id: one,
      email: legacyEmail,
    });
  check(!grant.error, "Legacy grant failed");
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: legacyEmail,
    options: { redirectTo: `${origin}/auth/callback?next=/painel/${one}` },
  });
  check(!generated.error, "Legacy link failed");
  const verify = await fetch(generated.data.properties.action_link, {
      redirect: "manual",
    }),
    location = verify.headers.get("location");
  check(location, "Legacy redirect missing");
  const params = new URLSearchParams(new URL(location).hash.slice(1));
  check(params.has("access_token"), "Legacy session unavailable");
  const confirmed = await fetch(`${origin}/api/auth/confirm`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      next: `/painel/${one}`,
    }),
  });
  check(confirmed.ok, "Legacy session confirmation failed");
  const cookie = confirmed.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const own = await fetch(`${origin}/painel/${one}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  check(own.status === 200, "Legacy session cookies failed");
  console.log(
    JSON.stringify({
      check: "Live editor access confirmation",
      status: "PASS",
      invite: true,
      magiclink: true,
      legacyImplicit: true,
      scannerVisitSafe: true,
      oneTime: true,
      portalIsolation: true,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      check: "Live editor access confirmation",
      status: "FAIL",
      stage,
      message: error instanceof Error ? error.message : "Verification failed",
    }),
  );
  process.exitCode = 1;
} finally {
  let clean = true;
  if (admin && organizationId) {
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
      check: "Access release cleanup",
      status: clean ? "PASS" : "FAIL",
    }),
  );
  if (!clean) process.exitCode = 1;
}
