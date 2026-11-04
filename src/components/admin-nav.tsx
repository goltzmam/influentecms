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
} from "lucide-react";
export function AdminNav({
  portals,
  isOwner = true,
}: {
  isOwner?: boolean;
  portals: { id: string; name: string; slug: string }[];
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
    ["paginas", "Páginas", FileText],
    ["dominios", "Domínios", Globe2],
    ...(isOwner ? [["equipe", "Equipe", Handshake] as const] : []),
    ["leitores", "Leitores e contato", Handshake],
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
      <nav className="admin-links">
        <Link className={path === "/painel" ? "nav-active" : ""} href="/painel">
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
        {portal && (
          <>
            <p className="workspace-label">{portal.name}</p>
            {links.map(([slug, label, Icon]) => (
              <Link
                key={slug}
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
            <a href={`/p/${portal.slug}`} target="_blank" rel="noreferrer">
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
