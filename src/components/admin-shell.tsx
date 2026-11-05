"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, ShieldCheck } from "lucide-react";
const titles: Record<string, string> = {
  ia: "Estúdio FLUE",
  novo: "Criar portal",
  configuracoes: "Configurações",
  noticias: "Notícias",
  categorias: "Categorias",
  homepage: "Editor visual",
  aparencia: "Personalização",
  midia: "Biblioteca de mídia",
  publicidade: "Publicidade",
  parceiros: "Parceiros",
  metricas: "Métricas comerciais",
  paginas: "Páginas",
  equipe: "Equipe",
  dominios: "Domínios",
  leitores: "Leitores e contato",
};
export function AdminShell({
  sidebar,
  email,
  isOwner,
  children,
}: {
  sidebar: React.ReactNode;
  email: string;
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false),
    path = usePathname(),
    parts = path.split("/").filter(Boolean),
    title =
      parts.length === 1
        ? "Visão geral"
        : titles[parts[2] || parts[1]] || "Visão geral do portal";
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <div className={`dashboard premium-admin ${open ? "admin-menu-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="admin-nav-overlay"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className="sidebar"
        id="admin-sidebar"
        aria-label="Navegação principal"
        onClickCapture={(e) => {
          if ((e.target as Element).closest("a")) setOpen(false);
        }}
      >
        {sidebar}
      </aside>
      <main className="main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-controls="admin-sidebar"
              aria-expanded={open}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="topbar-workspace">Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="admin-account">
            <span className="account-avatar">
              {email.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{email}</strong>
              <small>
                <ShieldCheck size={11} />
                {isOwner ? "Administrador" : "Editor do portal"}
              </small>
            </span>
          </div>
        </header>
        <div className="content">{children}</div>
        <footer className="admin-footer">
          <span>Influente CMS</span>
          <span>Seu conteúdo. Sua identidade.</span>
        </footer>
      </main>
    </div>
  );
}
