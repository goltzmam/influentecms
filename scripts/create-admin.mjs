import { createClient } from "@supabase/supabase-js";
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
if (names.some((name) => !process.env[name])) {
  console.error(`Configure: ${names.join(", ")}.`);
  process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 16) {
  console.error("Use uma senha única com pelo menos 16 caracteres.");
  process.exit(1);
}
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let createdId;
try {
  const { data, error } = await client.auth.admin.createUser({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error)
    throw new Error(
      "Criação recusada. Verifique a configuração e se o e-mail já existe.",
    );
  createdId = data.user.id;
  const { error: failure } = await client.rpc("provision_owner", {
    owner_id: createdId,
  });
  if (failure)
    throw new Error(
      "Falha no workspace. Verifique a migration e se já existe uma organização.",
    );
  console.log("Administrador e organização criados.");
} catch (error) {
  if (createdId) {
    const { error: cleanup } = await client.auth.admin.deleteUser(createdId);
    if (cleanup)
      console.error(
        "Revise Auth no Supabase: falha ao remover usuário incompleto.",
      );
  }
  console.error(
    error instanceof Error ? error.message : "Falha no provisionamento.",
  );
  process.exitCode = 1;
}
