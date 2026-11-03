import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
// CLI output contains local development credentials: parse in memory; never log it.
if (existsSync(".env.local"))
  throw new Error(
    ".env.local já existe; preserve seus valores e configure manualmente.",
  );
const raw = execFileSync("npx", ["supabase", "status", "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const fields = Object.fromEntries(
  raw
    .split("\n")
    .filter((s) => /^[A-Z_]+=/.test(s))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
if (!fields.API_URL || !fields.ANON_KEY || !fields.SERVICE_ROLE_KEY)
  throw new Error("Supabase local indisponível.");
if (!new URL(fields.API_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/))
  throw new Error("Este script só prepara serviços locais.");
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${fields.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${fields.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${fields.SERVICE_ROLE_KEY}\nAPP_URL=http://localhost:3000\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  ".env.local preparado para o Supabase local, sem exibir credenciais. Provisione seu administrador pelo README.",
);
