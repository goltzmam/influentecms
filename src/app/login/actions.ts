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
export async function emailLogin(form: FormData) {
  const email = z.email().safeParse(
    String(form.get("email") || "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) redirect("/login?error=credentials");
  const { createClient: publicClient } = await import("@supabase/supabase-js");
  const client = publicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, flowType: "implicit" } },
  );
  const sent=await client.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });
  if(sent.error && ["unexpected_failure","email_address_not_authorized","over_email_send_rate_limit"].includes(sent.error.code||""))redirect("/login?error=delivery");
  redirect("/login?sent=1");
}
