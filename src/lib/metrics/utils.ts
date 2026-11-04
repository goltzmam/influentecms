export const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : null;
export function placementLabel(
  value: string,
  sections: { id: string; title: string; type: string }[],
) {
  const labels: Record<string, string> = {
    header: "Cabeçalho",
    sidebar: "Coluna lateral",
    footer: "Rodapé",
    before: "Antes da seção",
    after: "Depois da seção",
    heading: "Título da editoria",
    partners: "Parceiros",
    "article-top": "Início da notícia",
    "article-middle": "Dentro da notícia",
    "article-bottom": "Fim da notícia",
    "page-top": "Início da página",
    "page-bottom": "Fim da página",
    category: "Editoria",
    between: "Entre editorias",
    sponsored: "Publieditorial",
    inline: "Dentro da seção",
    "before-content": "Antes do conteúdo",
    "after-content": "Depois do conteúdo",
  };
  const [key, id] = value.split(":");
  const section = sections.find((s) => s.id === id);
  return (
    (labels[key] || "Espaço personalizado") +
    (section ? " · " + (section.title || "Seção " + section.type) : "")
  );
}
