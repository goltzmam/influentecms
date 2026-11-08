"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requirePortal } from "@/lib/portal";
import { domainSchema } from "@/lib/validation";
import { resolveDomain } from "@/lib/domain-state";
import { vercel } from "@/lib/vercel";
import { serviceClient } from "@/lib/supabase/service";
const field = (f: FormData, k: string) => String(f.get(k) || "");
function path(portal?: string) {
  return portal ? `/painel/${portal}/dominios` : "/painel/dominios";
}
function done(url: string, message: string) {
  revalidatePath("/", "layout");
  redirect(`${url}?notice=${encodeURIComponent(message)}`);
}
function message(error: unknown) {
  if (error instanceof Error && error.message.startsWith("CMS:"))
    return error.message.slice(4, 600);
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}
async function domainAccess(portalId: string) {
  if (portalId) {
    const auth = await requirePortal(z.uuid().parse(portalId));
    return { ...auth, domainOrganizationId: auth.portal.organization_id };
  }
  const auth = await requireAdmin();
  return { ...auth, domainOrganizationId: auth.membership.organization_id };
}
export async function verifyManagedDomain(form: FormData) {
  const portalId = field(form, "portal_id");
  const auth = await domainAccess(portalId);
  const organizationId = auth.domainOrganizationId;
  let query = auth.client
    .from("domains")
    .select("id,hostname,verified,provider_status,portal_id,organization_id")
    .eq("organization_id", organizationId);
  if (portalId) query = query.eq("portal_id", portalId);
  const id = field(form, "domain_id") || field(form, "id");
  query = id
    ? query.eq("id", z.uuid().parse(id))
    : query.eq("hostname", domainSchema.parse(field(form, "hostname")));
  const { data, error } = await query.single();
  if (error || !data)
    return { error: "Domínio não encontrado ou acesso não autorizado." };
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID)
    return {
      domain: data,
      error: "A conexão automática precisa ser ativada pela administração.",
      automatic: false,
    };
  if (
    data.provider_status?.checked_at &&
    Date.now() - Date.parse(data.provider_status.checked_at) < 20000 &&
    !field(form, "force")
  )
    return {
      domain: data,
      automatic: true,
      error: data.provider_status.last_error || "",
    };
  try {
    const state = await resolveDomain(
      data.hostname,
      process.env.VERCEL_PROJECT_ID,
      vercel,
    );
    const service = await serviceClient();
    const result = await service
      .from("domains")
      .update({
        ...state,
        provider_status: { ...state.provider_status, last_error: "" },
      })
      .eq("id", data.id)
      .eq("organization_id", data.organization_id);
    if (result.error) throw result.error;
    revalidatePath("/", "layout");
    return { domain: { ...data, ...state }, automatic: true };
  } catch (error) {
    const text = message(error);
    const automatic = !(
      error instanceof Error &&
      ["connection_access", "connection_setup", "domain_conflict"].includes(
        (error as Error & { code?: string }).code || "",
      )
    );
    try {
      const service = await serviceClient();
      await service
        .from("domains")
        .update({
          provider_status: {
            ...data.provider_status,
            last_error: text,
            checked_at: new Date().toISOString(),
          },
        })
        .eq("id", data.id)
        .eq("organization_id", data.organization_id);
    } catch {}
    return { domain: data, error: text, automatic };
  }
}
export async function registerDomain(form: FormData) {
  const portalId = field(form, "portal_id");
  const auth = await domainAccess(portalId);
  const organizationId = auth.domainOrganizationId;
  let notice = "";
  try {
    const raw = field(form, "hostname").trim().toLowerCase();
    const host = domainSchema.parse(
      /^https?:\/\//.test(raw) ? new URL(raw).hostname : raw,
    );
    const appHost = new URL(
      process.env.APP_URL || "https://influentecms.vercel.app",
    ).hostname;
    if (
      host === appHost ||
      host.endsWith(".vercel.app") ||
      host === process.env.PORTAL_BASE_DOMAIN
    )
      throw new Error(
        "CMS:Use um domínio próprio. O endereço da plataforma já está disponível.",
      );
    const inserted = await auth.client
      .from("domains")
      .insert({
        organization_id: organizationId,
        portal_id: portalId || null,
        hostname: host,
      })
      .select("id")
      .single();
    if (inserted.error)
      throw new Error(
        "CMS:Este domínio já está cadastrado. Use a central para escolher ou alterar o portal vinculado.",
      );
    const check = new FormData();
    check.set("domain_id", inserted.data.id);
    if (portalId) check.set("portal_id", portalId);
    const result = await verifyManagedDomain(check);
    notice = result.error
      ? `Domínio salvo. ${result.error}`
      : result.domain?.verified
        ? "Domínio pronto para usar."
        : "Domínio salvo. Copie os registros indicados e verifique a conexão.";
  } catch (error) {
    notice =
      error instanceof z.ZodError
        ? "Informe um domínio válido, sem caminhos ou espaços."
        : message(error);
  }
  done(path(portalId), notice);
}
export async function assignDomain(form: FormData) {
  const auth = await requireAdmin();
  let notice = "Vínculo atualizado.";
  try {
    const id = z.uuid().parse(field(form, "domain_id"));
    const portal = field(form, "target_portal_id");
    if (portal) z.uuid().parse(portal);
    const r = await auth.client.rpc("assign_portal_domain", {
      p_domain: id,
      p_portal: portal || null,
      p_transfer: field(form, "transfer") === "yes",
    });
    if (r.error)
      throw new Error(
        "CMS:O domínio já está em uso ou não está disponível para este portal. Atualize a lista e tente novamente.",
      );
  } catch (e) {
    notice = message(e);
  }
  done(path(field(form, "return_portal_id")), notice);
}
export async function releaseDomain(form: FormData) {
  const portalId = field(form, "portal_id");
  const auth = await domainAccess(portalId);
  const organizationId = auth.domainOrganizationId;
  let notice =
    "Domínio desvinculado. Ele está disponível na central para outro portal.";
  try {
    const id = z.uuid().parse(field(form, "domain_id") || field(form, "id"));
    let q = auth.client
      .from("domains")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (portalId) q = q.eq("portal_id", portalId);
    const d = await q.single();
    if (d.error) throw d.error;
    const r = await auth.client.rpc("release_portal_domain", { p_domain: id });
    if (r.error) throw r.error;
  } catch (e) {
    notice = message(e);
  }
  done(path(portalId), notice);
}
export async function removeRegisteredDomain(form: FormData) {
  const auth = await requireAdmin();
  let notice = "Domínio removido da central.";
  try {
    const id = z.uuid().parse(field(form, "domain_id"));
    const d = await auth.client
      .from("domains")
      .select("id,hostname,portal_id")
      .eq("id", id)
      .eq("organization_id", auth.membership.organization_id)
      .single();
    if (d.error || !d.data) throw new Error("CMS:Domínio não encontrado.");
    if (d.data.portal_id)
      throw new Error(
        "CMS:Desvincule o domínio antes de removê-lo da central.",
      );
    const hostname = d.data.hostname;
    if (
      hostname.endsWith(".vercel.app") ||
      hostname ===
        new URL(process.env.APP_URL || "https://influentecms.vercel.app")
          .hostname
    )
      throw new Error("CMS:Este endereço da plataforma não pode ser removido.");
    await vercel(
      `/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID || "")}/domains/${encodeURIComponent(hostname)}`,
      { method: "DELETE", allow404: true },
    );
    const r = await auth.client
      .from("domains")
      .delete()
      .eq("id", id)
      .eq("organization_id", auth.membership.organization_id)
      .is("portal_id", null);
    if (r.error) throw r.error;
  } catch (e) {
    notice = message(e);
  }
  done(path(), notice);
}
