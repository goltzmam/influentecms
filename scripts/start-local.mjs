import { spawnSync } from "node:child_process";
import { openSync, closeSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const flags = process.argv.slice(2);
if (flags.some((flag) => flag !== "--ignore-health-check"))
  throw new Error("Opção local não suportada.");
// Supabase start can print local keys. Keep output private and never echo it.
const log = join(tmpdir(), `influente-supabase-${process.pid}.log`);
const fd = openSync(log, "wx", 0o600);
const result = spawnSync(
  "npx",
  [
    "supabase",
    "start",
    "-x",
    "realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
    ...flags,
  ],
  { stdio: ["ignore", fd, fd] },
);
const migration =
  result.status === 0
    ? spawnSync("npx", ["supabase", "migration", "up", "--local"], {
        stdio: ["ignore", fd, fd],
      })
    : null;
closeSync(fd);
if (result.status !== 0 || migration?.status !== 0) {
  console.error(
    `Falha ao iniciar Supabase. Diagnóstico privado salvo em ${log}; não compartilhe credenciais do arquivo.`,
  );
  process.exit(result.status || 1);
}
unlinkSync(log);
console.log(
  "Supabase local iniciado. Configure .env.local se necessário e execute node scripts/check-local.mjs para confirmar prontidão.",
);
