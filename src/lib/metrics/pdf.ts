import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { loadMetricReport } from "./report";
import { placementLabel } from "./utils.ts";
export async function metricPdf(
  data: Awaited<ReturnType<typeof loadMetricReport>>,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await readFile(join(process.cwd(), "assets/fonts/DejaVuSans-Bold.ttf")),
    { subset: true },
  );
  doc.setTitle(`Métricas · ${data.portal.name}`);
  doc.setAuthor("Influente");
  const pages: PDFPage[] = [];
  let page: PDFPage,
    y = 0;
  const newPage = () => {
    page = doc.addPage([595, 842]);
    pages.push(page);
    y = 790;
    page.drawRectangle({
      x: 0,
      y: 810,
      width: 595,
      height: 32,
      color: rgb(0.14, 0.32, 0.23),
    });
  };
  newPage();
  const text = (value: string, size = 10, color = rgb(0.12, 0.22, 0.17)) => {
    const words = value.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(line + " " + word, size) > 495 && line) {
        if (y < 60) newPage();
        page.drawText(line, { x: 45, y, size, font, color });
        y -= size + 7;
        line = word;
      } else line = line ? line + " " + word : word;
    }
    if (line) {
      if (y < 60) newPage();
      page.drawText(line, { x: 45, y, size, font, color });
      y -= size + 9;
    }
  };
  text("INFLUENTE · RELATÓRIO COMERCIAL", 10);
  text(data.portal.name, 21);
  text(
    `${data.filters.from} a ${data.filters.until} · Horário de Brasília`,
    10,
  );
  if (data.filters.item)
    text(
      data.report.items.find((i) => i.item_id === data.filters.item)?.name ||
        "Peça selecionada",
      14,
    );
  y -= 15;
  const n = (v: number) => Number(v || 0).toLocaleString("pt-BR");
  const t = data.report.totals;
  for (const [label, value] of [
    ["Exibições", n(t.served)],
    ["Visualizações visíveis", n(t.views)],
    ["Cliques em links", n(t.clicks)],
    [
      "CTR sobre exibições",
      data.ctr === null ? "—" : (data.ctr * 100).toFixed(2) + "%",
    ],
    ["Alcance único", n(t.reach)],
    ["Frequência", data.frequency === null ? "—" : data.frequency.toFixed(2)],
    ["Cliques únicos", n(t.clickers)],
    [
      "Vídeos iniciados / concluídos",
      `${n(t.video_starts)} / ${n(t.completions)}`,
    ],
    [
      "Progresso 25% / 50% / 75%",
      `${n(t.video25)} / ${n(t.video50)} / ${n(t.video75)}`,
    ],
    ["Tempo assistido", n(Math.round(t.watch_seconds)) + " s"],
    ["Cliques em chamadas", n(t.cta)],
  ])
    text(`${label}: ${value}`, 11);
  if (data.filters.investment !== undefined) {
    y -= 10;
    text(
      `Investimento informado no período: R$ ${data.filters.investment.toFixed(2)}`,
    );
    text(
      `CPC: ${data.cpc === null ? "—" : "R$ " + data.cpc.toFixed(2)} · CPM: ${data.cpm === null ? "—" : "R$ " + data.cpm.toFixed(2)}`,
    );
  }
  y -= 20;
  text("RESULTADOS POR PEÇA", 13);
  for (const i of data.report.items)
    text(
      `${i.name}${i.demo ? " [DEMONSTRAÇÃO]" : ""} · ${i.kind === "campaign" ? "Campanha" : "Parceiro"} | ${n(i.served)} exibições | ${n(i.views)} visíveis | ${n(i.reach)} alcance | ${i.mediaType === "google" ? "cliques oficiais indisponíveis" : n(i.clicks) + " cliques"}`,
      9,
    );
  for (const [key, label] of [
    ["device", "DISPOSITIVOS"],
    ["source", "ORIGENS"],
    ["page", "PÁGINAS"],
    ["placement", "POSIÇÕES"],
  ]) {
    y -= 16;
    text(label, 12);
    for (const row of data.report.dimensions
      .filter((d) => d.dimension === key)
      .sort((a, b) => b.views - a.views)
      .slice(0, 30))
      text(
        `${key === "placement" ? placementLabel(row.label, data.portal.home_published) : row.label}: ${n(row.views)} visualizações · ${n(row.clicks)} cliques`,
        9,
      );
  }
  y -= 18;
  text("EVOLUÇÃO DIÁRIA", 12);
  for (const row of data.report.daily)
    text(
      `${row.day}: ${n(row.views)} visualizações · ${n(row.clicks)} cliques`,
      9,
    );
  y -= 20;
  text(
    "Exibições contam renderizações. Visualização: ao menos 50% visível por 1 s; vídeo por 2 s. Alcance usa identificadores anônimos. Prévias e demonstrações não contam. Progresso de vídeo requer arquivo enviado. Dados Google, receita e conversões oficiais não são estimados. Investimento é informado pelo usuário.",
    8,
  );
  pages.forEach((p, i) =>
    p.drawText(
      `${i + 1} / ${pages.length} · Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      { x: 45, y: 28, size: 8, font, color: rgb(0.4, 0.48, 0.43) },
    ),
  );
  return doc.save();
}
