import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Configure Supabase local.");
for (const path of [
  "/auth/v1/health",
  "/rest/v1/portals?select=id&limit=1",
  "/storage/v1/status",
]) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(`Falha de prontidão ${path}: HTTP ${response.status}`);
  console.log(`PASS ${path}`);
}
const settings = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
}).then((r) => r.json());
if (settings.disable_signup !== true)
  throw new Error("Cadastro público precisa estar desativado.");
console.log("PASS cadastro público desativado");
