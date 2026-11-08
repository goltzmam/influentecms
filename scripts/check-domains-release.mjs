// Explicit production release check. Never prints or exports credentials.
// Reconciles only domains already requested through the authenticated portal panel.
import { createClient } from "@supabase/supabase-js";
import { resolveDomain } from "../src/lib/domain-state.ts";
const project = process.env.VERCEL_PROJECT_ID,
  token = process.env.VERCEL_API_TOKEN;
async function api(path, options = {}) {
  const endpoint = new URL(path, "https://api.vercel.com");
  if (process.env.VERCEL_TEAM_ID)
    endpoint.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  const response = await fetch(endpoint, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404 && options.allow404) return null;
  if (
    response.status === 400 &&
    options.allowPendingVerification &&
    endpoint.pathname.endsWith("/verify")
  )
    return null;
  if (!response.ok)
    throw new Error(`Hosting authorization HTTP ${response.status}`);
  return response.status === 204 ? {} : response.json();
}
try {
  if (!project || !token)
    throw new Error("Production domain credential missing");
  await api(`/v9/projects/${encodeURIComponent(project)}/domains`);
  console.log(
    JSON.stringify({
      check: "Production domain API authorization",
      status: "PASS",
    }),
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    const ref = new URL(url).hostname.split(".")[0];
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw new Error(`Server authorization HTTP ${response.status}`);
    const keys = await response.json();
    serviceKey = (Array.isArray(keys) ? keys : keys.keys || []).find(
      (k) => k.name === "service_role",
    )?.api_key;
  }
  if (!serviceKey) throw new Error("Server domain verification unavailable");
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: domains, error } = await client
    .from("domains")
    .select("id,portal_id,hostname");
  if (error) throw new Error("Registered domains lookup failed");
  let failed = 0,
    connected = 0,
    pending = 0;
  for (const domain of domains) {
    try {
      const state = await resolveDomain(domain.hostname, project, api);
      const result = await client
        .from("domains")
        .update(state)
        .eq("id", domain.id)
        .eq("hostname", domain.hostname);
      if (result.error) throw new Error("Domain state update failed");
      state.verified ? connected++ : pending++;
      console.log(
        JSON.stringify({
          check: "Registered domain connection",
          hostname: domain.hostname,
          status: state.verified ? "CONNECTED" : "DNS_PENDING",
          dnsInstructionsSaved: true,
        }),
      );
    } catch (error) {
      failed++;
      console.log(
        JSON.stringify({
          check: "Registered domain connection",
          hostname: domain.hostname,
          status: "FAIL",
          reason:
            error instanceof Error &&
            error.message.startsWith("Hosting authorization HTTP")
              ? error.message
              : "Connection could not be verified",
        }),
      );
    }
  }
  const requested = process.argv
    .find((a) => a.startsWith("--check-host="))
    ?.slice("--check-host=".length);
  if (requested) {
    const entry = domains.find((d) => d.hostname === requested);
    if (!entry?.portal_id)
      throw new Error("Requested domain is not linked to a portal");
    const portal = await client
      .from("portals")
      .select("slug")
      .eq("id", entry.portal_id)
      .single();
    const route = await client.rpc("resolve_portal_hostname", {
      p_hostname: requested,
      p_base: process.env.PORTAL_BASE_DOMAIN || null,
    });
    if (portal.error || route.error || route.data !== portal.data?.slug)
      throw new Error("Domain routing differs from portal binding");
    const publicResponse = await fetch(`https://${requested}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (publicResponse.status !== 200)
      throw new Error(`Public portal HTTPS returned ${publicResponse.status}`);
    await publicResponse.body?.cancel();
    console.log(
      JSON.stringify({
        check: "Requested domain public HTTPS and routing",
        hostname: requested,
        status: "PASS",
        https: 200,
        portalBindingMatches: true,
      }),
    );
  }
  console.log(
    JSON.stringify({
      check: "Domain reconciliation",
      status: failed ? "FAIL" : "PASS",
      registered: domains.length,
      connected,
      dnsPending: pending,
      failed,
    }),
  );
  if (failed) process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify({
      check: "Domain release readiness",
      status: "FAIL",
      reason:
        error instanceof Error ? error.message : "Verification unavailable",
    }),
  );
  process.exitCode = 1;
}
