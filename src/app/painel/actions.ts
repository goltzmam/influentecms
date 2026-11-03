"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";
import { requirePortal } from "@/lib/portal";
import {
  articleSchema,
  domainSchema,
  imageSchema,
  linkSchema,
  sectionsSchema,
  settingsSchema,
  slugSchema,
} from "@/lib/validation";
import { cleanHtml } from "@/lib/content";
import { vercel } from "@/lib/vercel";
import { serviceClient } from "@/lib/supabase/service";
const str = (f: FormData, k: string) => String(f.get(k) || "");
function date(f: FormData, k: string) {
  const v = str(f, k);
  return v ? new Date(v.endsWith("Z") ? v : `${v}:00Z`).toISOString() : null;
}
function issue(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues
      .map((i) => i.message)
      .join(" ")
      .slice(0, 500);
  if (error instanceof Error && error.message.startsWith("CMS:"))
    return error.message.slice(4, 500);
  return "Não foi possível salvar. Confira os campos, a conexão e as migrations. Slugs e domínios devem ser únicos.";
}
function finish(path: string, message: string) {
  revalidatePath("/", "layout");
  redirect(`${path}?notice=${encodeURIComponent(message)}`);
}
export async function createPortal(form: FormData) {
  const { client, membership } = await requireAdmin();
  let id = "",
    message = "";
  try {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        slug: slugSchema,
        template: z.enum(["classic", "modern"]),
        color: z.string().regex(/^#[a-f0-9]{6}$/i),
        logo: imageSchema,
      })
      .parse(Object.fromEntries(form));
    const { data, error } = await client
      .from("portals")
      .insert({
        organization_id: membership.organization_id,
        name: input.name,
        slug: input.slug,
        template: input.template,
        settings: {
          color: input.color,
          accentColor: "#d5ff00",
          logo: input.logo,
          font: input.template === "modern" ? "serif" : "sans",
        },
      })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    const logoFile = form.get("logo_file");
    if (logoFile instanceof File && logoFile.size) {
      const upload = new FormData();
      upload.set("portal_id", id);
      upload.set("file", logoFile);
      const result = await uploadMedia(upload);
      if (result.error)
        throw new Error(
          `CMS:Portal criado, mas o logotipo não foi enviado: ${result.error} Acesse a personalização para tentar novamente.`,
        );
      const saved = await client
        .from("portals")
        .update({
          settings: {
            color: input.color,
            accentColor: "#d5ff00",
            logo: result.url,
            font: input.template === "modern" ? "serif" : "sans",
          },
        })
        .eq("id", id);
      if (saved.error) throw saved.error;
    }
  } catch (e) {
    message = issue(e);
  }
  if (message) finish(id ? `/painel/${id}/aparencia` : "/painel/novo", message);
  finish(`/painel/${id}`, "Portal criado.");
}
export async function saveArticle(form: FormData) {
  const portalId = z.uuid().parse(str(form, "portal_id"));
  const { client, portal } = await requirePortal(portalId);
  let message = "Notícia salva.";
  try {
    const status = str(form, "status");
    const value = articleSchema.parse({
      title: str(form, "title"),
      slug: str(form, "slug"),
      subtitle: str(form, "subtitle"),
      content: str(form, "content"),
      author: str(form, "author"),
      cover_url: str(form, "cover_url"),
      cover_alt: str(form, "cover_alt"),
      tags: str(form, "tags")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      category_id: str(form, "category_id") || null,
      seo_title: str(form, "seo_title"),
      seo_description: str(form, "seo_description"),
      status,
      publish_at:
        status === "published"
          ? date(form, "publish_at") &&
            Date.parse(date(form, "publish_at")!) <= Date.now()
            ? date(form, "publish_at")
            : new Date().toISOString()
          : date(form, "publish_at"),
    });
    const id = str(form, "id");
    const payload = {
      ...value,
      content: cleanHtml(value.content),
      updated_at: new Date().toISOString(),
    };
    let result;
    if (id)
      result = await client
        .from("articles")
        .update(payload)
        .eq("id", z.uuid().parse(id))
        .eq("portal_id", portal.id)
        .select("id")
        .single();
    else
      result = await client
        .from("articles")
        .insert({
          ...payload,
          portal_id: portal.id,
          organization_id: portal.organization_id,
        })
        .select("id")
        .single();
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portalId}/noticias`, message);
}
export async function saveCategory(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Categoria criada.";
  try {
    const input = z
      .object({ name: z.string().trim().min(1).max(100), slug: slugSchema })
      .parse(Object.fromEntries(form));
    const { error } = await client.from("categories").insert({
      ...input,
      organization_id: portal.organization_id,
      portal_id: portal.id,
    });
    if (error) throw error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/categorias`, message);
}
export async function saveSettings(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Personalização salva.";
  try {
    const settings = settingsSchema.parse({
      ...portal.settings,
      logo: str(form, "logo"),
      favicon: str(form, "favicon"),
      color: str(form, "color"),
      font: str(form, "font"),
      description: str(form, "description"),
      header: str(form, "header"),
      footer: str(form, "footer"),
      menus: JSON.parse(str(form, "menus") || "[]"),
      menusMode: str(form,"menusMode")||"auto",
      socials: JSON.parse(str(form, "socials") || "[]"),
      accentColor: str(form, "accentColor"),
      surfaceColor: str(form, "surfaceColor"),
      textColor: str(form, "textColor"),
      tagline: str(form, "tagline"),
      whatsappUrl: str(form, "whatsappUrl"),
      whatsappText: str(form, "whatsappText"),
      videoUrl: str(form, "videoUrl"),
      videoTitle: str(form, "videoTitle"),
      videosLink: str(form, "videosLink"),
      newsletterTitle: str(form, "newsletterTitle"),
      newsletterText: str(form, "newsletterText"),
      contactTitle: str(form, "contactTitle"),
      privacyUrl: str(form, "privacyUrl"),
      contactEmail: str(form, "contactEmail"),
      contactPhone: str(form, "contactPhone"),
      commercialEmail: str(form, "commercialEmail"),
      commercialPhone: str(form, "commercialPhone"),
      commercialText: str(form, "commercialText"),
      seoTitle: str(form, "seoTitle"),
      seoDescription: str(form, "seoDescription"),
      ogImage: str(form, "ogImage"),
      contactEnabled: form.has("contactEnabled"),
      newsletterEnabled: form.has("newsletterEnabled"),
      socialCards: JSON.parse(str(form, "socialCards") || "[]"),
    });
    const name = z.string().trim().min(1).max(120).parse(str(form, "name"));
    const template = z.enum(["classic", "modern"]).parse(str(form, "template"));
    const { error } = await client
      .from("portals")
      .update({ name, template, settings })
      .eq("id", portal.id);
    if (error) throw error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/aparencia`, message);
}
export async function saveHomepage(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Rascunho da homepage salvo.";
  try {
    const sections = sectionsSchema.parse(JSON.parse(str(form, "sections")));
    const ids = sections.flatMap((s) => s.articleIds || []);
    const categories = sections.map((s) => s.categoryId).filter(Boolean);
    if (ids.length) {
      const { data, error } = await client
        .from("articles")
        .select("id")
        .eq("portal_id", portal.id)
        .in("id", ids);
      if (error || ids.some((id) => !data?.some((row) => row.id === id)))
        throw new Error("CMS:Escolha apenas notícias deste portal.");
    }
    if (categories.length) {
      const { data, error } = await client
        .from("categories")
        .select("id")
        .eq("portal_id", portal.id)
        .in("id", categories);
      if (error || categories.some((id) => !data?.some((row) => row.id === id)))
        throw new Error("CMS:Escolha apenas categorias deste portal.");
    }
    const publish = str(form, "intent") === "publish";
    const { error } = await client
      .from("portals")
      .update(
        publish
          ? { home_draft: sections, home_published: sections }
          : { home_draft: sections },
      )
      .eq("id", portal.id);
    if (error) throw error;
    if (publish) message = "Homepage publicada.";
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/homepage`, message);
}
export async function uploadMedia(
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let path = "";
  try {
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("CMS:Envie uma imagem de até 5 MB.");
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      )
    )
      throw new Error("CMS:Formato permitido: JPG, PNG, WebP ou AVIF.");
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, {
      limitInputPixels: 40000000,
    }).metadata();
    if (
      !["jpeg", "png", "webp", "avif", "heif"].includes(
        metadata.format || "",
      ) ||
      (metadata.pages || 1) > 1
    )
      throw new Error("CMS:Imagem inválida ou animada.");
    const buffer = await sharp(input, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    path = `${portal.organization_id}/${portal.id}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage
      .from("portal-media")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const { data } = client.storage.from("portal-media").getPublicUrl(path);
    const { error: dbError } = await client.from("media").insert({
      organization_id: portal.organization_id,
      portal_id: portal.id,
      name: file.name.slice(0, 200),
      path,
      url: data.publicUrl,
      size: buffer.length,
    });
    if (dbError) throw dbError;
    revalidatePath(`/painel/${portal.id}/midia`);
    return { url: data.publicUrl };
  } catch (e) {
    if (path) await client.storage.from("portal-media").remove([path]);
    return { error: issue(e) };
  }
}
export async function saveCampaign(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Campanha salva.";
  try {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        image_url: imageSchema.refine(Boolean, "Envie a imagem."),
        link: linkSchema,
        position: z.enum([
          "header",
          "sidebar",
          "footer",
          "between",
          "category",
          "sponsored",
        ]),
        starts_at: z.iso.datetime().nullable(),
        ends_at: z.iso.datetime().nullable(),
        active: z.boolean(),
      })
      .parse({
        name: str(form, "name"),
        image_url: str(form, "image_url"),
        link: str(form, "link"),
        position: str(form, "position"),
        starts_at: date(form, "starts_at"),
        ends_at: date(form, "ends_at"),
        active: form.has("active"),
      });
    if (input.starts_at && input.ends_at && input.ends_at <= input.starts_at)
      throw new Error("CMS:A data final deve ser posterior à inicial.");
    const id = str(form, "id");
    const result = id
      ? await client
          .from("campaigns")
          .update(input)
          .eq("id", z.uuid().parse(id))
          .eq("portal_id", portal.id)
          .select("id")
          .single()
      : await client.from("campaigns").insert({
          ...input,
          organization_id: portal.organization_id,
          portal_id: portal.id,
        });
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/publicidade`, message);
}
export async function savePartner(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Parceiro salvo.";
  try {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        image_url: imageSchema.refine(Boolean),
        link: linkSchema,
        active: z.boolean(),
      })
      .parse({
        name: str(form, "name"),
        image_url: str(form, "image_url"),
        link: str(form, "link"),
        active: form.has("active"),
      });
    const id = str(form, "id");
    const result = id
      ? await client
          .from("partners")
          .update(input)
          .eq("id", z.uuid().parse(id))
          .eq("portal_id", portal.id)
          .select("id")
          .single()
      : await client.from("partners").insert({
          ...input,
          organization_id: portal.organization_id,
          portal_id: portal.id,
        });
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/parceiros`, message);
}
export async function savePage(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Página salva.";
  try {
    const input = z
      .object({
        title: z.string().trim().min(1).max(200),
        slug: slugSchema,
        content: z.string().max(200000),
        published: z.boolean(),
      })
      .parse({
        title: str(form, "title"),
        slug: str(form, "slug"),
        content: str(form, "content"),
        published: form.has("published"),
      });
    const payload = { ...input, content: cleanHtml(input.content) };
    const id = str(form, "id");
    const result = id
      ? await client
          .from("pages")
          .update(payload)
          .eq("id", z.uuid().parse(id))
          .eq("portal_id", portal.id)
          .select("id")
          .single()
      : await client.from("pages").insert({
          ...payload,
          organization_id: portal.organization_id,
          portal_id: portal.id,
        });
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/paginas`, message);
}
export async function removeRecord(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Registro excluído.";
  const table = z
    .enum([
      "articles",
      "categories",
      "campaigns",
      "partners",
      "pages",
      "media",
      "portal_contacts",
      "portal_subscribers",
    ])
    .parse(str(form, "table"));
  const paths = {
    articles: "noticias",
    categories: "categorias",
    campaigns: "publicidade",
    partners: "parceiros",
    pages: "paginas",
    media: "midia",
    portal_contacts: "leitores",
    portal_subscribers: "leitores",
  };
  try {
    const id = z.uuid().parse(str(form, "id"));
    if (table === "media") {
      const { data, error } = await client
        .from("media")
        .select("path")
        .eq("id", id)
        .eq("portal_id", portal.id)
        .single();
      if (error) throw error;
      const result = await client.storage
        .from("portal-media")
        .remove([data.path]);
      if (result.error) throw result.error;
    }
    const { error } = await client
      .from(table)
      .delete()
      .eq("id", id)
      .eq("portal_id", portal.id);
    if (error) throw error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/${paths[table]}`, message);
}
export async function addDomain(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Domínio cadastrado. Configure o DNS e verifique.";
  try {
    const hostname = domainSchema.parse(str(form, "hostname"));
    // Validate local credentials before making any provider change.
    serviceClient();
    const { data: existing, error: readError } = await client
      .from("domains")
      .select("id")
      .eq("hostname", hostname)
      .maybeSingle();
    if (readError || existing)
      throw new Error("CMS:Domínio indisponível ou já cadastrado.");
    // Reserve globally before the external request; failed provisioning is safe to retry via verify.
    const { error } = await client.from("domains").insert({
      hostname,
      portal_id: portal.id,
      organization_id: portal.organization_id,
    });
    if (error) throw error;
    const projectDomain = await vercel(
      `/v10/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID!)}/domains`,
      { method: "POST", body: JSON.stringify({ name: hostname }) },
    );
    const config = await vercel(
      `/v6/domains/${encodeURIComponent(hostname)}/config`,
    );
    const result = await serviceClient()
      .from("domains")
      .update({
        provider_status: {
          verification: projectDomain.verification || [],
          misconfigured: config.misconfigured,
          recommendedCNAME: config.recommendedCNAME || [],
          recommendedIPv4: config.recommendedIPv4 || [],
          checked_at: new Date().toISOString(),
        },
      })
      .eq("hostname", hostname)
      .eq("portal_id", portal.id);
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/dominios`, message);
}
export async function verifyDomain(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "DNS consultado.";
  try {
    const id = z.uuid().parse(str(form, "id"));
    const { data, error } = await client
      .from("domains")
      .select("*")
      .eq("id", id)
      .eq("portal_id", portal.id)
      .single();
    if (error) throw error;
    const service = serviceClient();
    const host = encodeURIComponent(data.hostname),
      project = encodeURIComponent(process.env.VERCEL_PROJECT_ID || "");
    // GET ownership first; a hostname on another project must never be accepted.
    let projectDomain = await vercel(
      `/v9/projects/${project}/domains/${host}`,
      { allow404: true },
    );
    if (!projectDomain)
      projectDomain = await vercel(`/v10/projects/${project}/domains`, {
        method: "POST",
        body: JSON.stringify({ name: data.hostname }),
      });
    if (!projectDomain.verified)
      projectDomain = await vercel(
        `/v9/projects/${project}/domains/${host}/verify`,
        { method: "POST" },
      );
    const config = await vercel(`/v6/domains/${host}/config`);
    const verified =
      projectDomain.verified === true && config.misconfigured === false;
    const { error: updateError } = await service
      .from("domains")
      .update({
        verified,
        provider_status: {
          verification: projectDomain.verification || [],
          misconfigured: config.misconfigured,
          recommendedCNAME: config.recommendedCNAME || [],
          recommendedIPv4: config.recommendedIPv4 || [],
          checked_at: new Date().toISOString(),
        },
      })
      .eq("id", id);
    if (updateError) throw updateError;
    message = verified
      ? "Domínio verificado. HTTPS é emitido automaticamente pela Vercel."
      : "DNS ainda pendente. Confira os registros e tente novamente.";
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/dominios`, message);
}
export async function deleteDomain(form: FormData) {
  const { client, portal } = await requirePortal(str(form, "portal_id"));
  let message = "Domínio desconectado.";
  try {
    const { data, error } = await client
      .from("domains")
      .select("id,hostname")
      .eq("id", z.uuid().parse(str(form, "id")))
      .eq("portal_id", portal.id)
      .single();
    if (error) throw error;
    await vercel(
      `/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID || "")}/domains/${encodeURIComponent(data.hostname)}`,
      { method: "DELETE", allow404: true },
    );
    const result = await client
      .from("domains")
      .delete()
      .eq("id", data.id)
      .eq("portal_id", portal.id);
    if (result.error) throw result.error;
  } catch (e) {
    message = issue(e);
  }
  finish(`/painel/${portal.id}/dominios`, message);
}
