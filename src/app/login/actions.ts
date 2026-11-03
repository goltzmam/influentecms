"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export async function login(form: FormData) {
  const input = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) redirect("/login?error=credentials");
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) redirect("/login?error=credentials");
  redirect("/painel");
}
