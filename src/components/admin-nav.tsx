"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Globe2,
  Newspaper,
  Palette,
  PanelsTopLeft,
  ImageIcon,
  Megaphone,
  Handshake,
  Settings2,
  Tags,
  FileText,
  ExternalLink,
  Sparkles,
  ChartNoAxesCombined,
  Users,
  SlidersHorizontal,
} from "lucide-react";
export function AdminNav({
  portals,
  isOwner = true,
}: {
  isOwner?: boolean;
  portals: { id: string; name: string; slug: string; url?: string }[];
}) {
  const path = usePathname(),
    router = useRouter();
  const id = path.split("/")[2];
  const portal = portals.find((p) => p.id === id);
  const links = [
    ["", "Visão geral", LayoutDashboard],
    ["noticias", "Notícias", Newspaper],
    ["categorias", "Categorias", Tags],
    ["homepage", "Homepage", PanelsTopLeft],
    ["aparencia", "Personalização", Palette],
    ["midia", "Biblioteca de mídia", ImageIcon],
    ["publicidade", "Publicidade", Megaphone],
    ["parceiros", "Parceiros", Handshake],
    ["metricas", "Métricas comerciais", ChartNoAxesCombined],
    ["paginas", "Páginas", FileText],
    ["dominios", "Domínios", Globe2],
    ...(isOwner ? [["equipe", "Equipe", Users] as const] : []),
    ["leitores", "Leitores e contato", Users],
    ...(isOwner
      ? [
          [
            "configuracoes",
            "Configurações do portal",
            SlidersHorizontal,
          ] as const,
        ]
      : []),
  ] as const;
  return (
    <>
      <label className="workspace-label" htmlFor="portal-select">
        SEU WORKSPACE
      </label>
      <select
        id="portal-select"
        value={portal?.id || ""}
        onChange={(e) =>
          router.push(e.target.value ? `/painel/${e.target.value}` : "/painel")
        }
      >
        <option value="">Todos os portais</option>
        {portals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <nav className="admin-links" aria-label="Seções do painel">
        <Link
          aria-current={path === "/painel" ? "page" : undefined}
          className={path === "/painel" ? "nav-active" : ""}
          href="/painel"
        >
          <LayoutDashboard size={17} />
          Dashboard geral
        </Link>
        {isOwner && (
          <Link
            className={path === "/painel/ia" ? "nav-active" : ""}
            href="/painel/ia"
          >
            <Sparkles size={17} />
            Criar com IA
          </Link>
        )}
        {isOwner && (
          <Link
            href="/painel/dominios"
            className={path === "/painel/dominios" ? "nav-active" : ""}
          >
            <Globe2 size={17} />
            Central de domínios
          </Link>
        )}
        {portal && (
          <>
            <p className="workspace-label">{portal.name}</p>
            {links.map(([slug, label, Icon]) => (
              <Link
                key={slug}
                aria-current={
                  path === `/painel/${portal.id}${slug ? "/" + slug : ""}`
                    ? "page"
                    : undefined
                }
                className={
                  path === `/painel/${portal.id}${slug ? "/" + slug : ""}`
                    ? "nav-active"
                    : ""
                }
                href={`/painel/${portal.id}${slug ? "/" + slug : ""}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
            <a
              href={portal.url || `/p/${portal.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} />
              Abrir portal
            </a>
          </>
        )}
        <Link href="/painel/configuracoes">
          <Settings2 size={17} />
          Configurações gerais
        </Link>
      </nav>
    </>
  );
}
