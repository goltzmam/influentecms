import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/security";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) return new Response("Não foi possível sair.", { status: 503 });
  return NextResponse.redirect(
    new URL("/login", request.headers.get("origin")!),
    303,
  );
}
