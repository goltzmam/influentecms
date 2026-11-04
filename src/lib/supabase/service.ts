import "server-only";
import { createClient } from "@supabase/supabase-js";
let cached: { key: string; expires: number } | undefined;
export async function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url)
    throw new Error(
      "CMS:O serviço está temporariamente indisponível. Tente novamente.",
    );
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key && cached && cached.expires > Date.now()) key = cached.key;
  if (
    !key &&
    process.env.SUPABASE_ACCESS_TOKEN &&
    new URL(url).hostname.endsWith(".supabase.co")
  ) {
    const ref = new URL(url).hostname.split(".")[0];
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.ok) {
      const data = await response.json();
      key = (Array.isArray(data) ? data : data.keys || []).find(
        (k: { name: string }) => k.name === "service_role",
      )?.api_key;
      if (key) cached = { key, expires: Date.now() + 300000 };
    }
  }
  if (!key)
    throw new Error(
      "CMS:Não foi possível concluir a conexão. Tente novamente em instantes ou contate o responsável pela plataforma.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
