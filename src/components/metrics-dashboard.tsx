import Link from "next/link";
import type { loadMetricReport } from "@/lib/metrics/report";
import { placementLabel, ratio } from "@/lib/metrics/report";
const number = (v: number) => Number(v || 0).toLocaleString("pt-BR");
const percent = (v: number | null) =>
  v === null
    ? "—"
    : (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
const money = (v: number | null) =>
  v === null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function MetricsDashboard({
  data,
}: {
  data: Awaited<ReturnType<typeof loadMetricReport>>;
}) {
  const { portal, report: r, filters: f } = data,
    t = r.totals;
  const base = `/painel/${portal.id}/metricas`,
    params = new URLSearchParams(
      Object.entries(f)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
  const selected = r.items.find((i) => i.item_id === f.item);
  const cards = [
    ["Exibições", number(t.served), "Peça renderizada no portal"],
    [
      "Visualizações visíveis",
      number(t.views),
      "Ao menos 50% visível por 1 s; vídeo por 2 s",
    ],
    ["Cliques", number(t.clicks), "Cliques em links da peça"],
    ["CTR", percent(data.ctr), "Cliques ÷ exibições"],
    ["Alcance único", number(t.reach), "Navegadores com visualização válida"],
    [
      "Frequência",
      data.frequency === null ? "—" : data.frequency.toFixed(2),
      "Visualizações ÷ alcance",
    ],
    ["Visibilidade", percent(data.viewability), "Visualizações ÷ exibições"],
    ["Cliques únicos", number(t.clickers), "Navegadores que clicaram"],
  ];
  const max = Math.max(1, ...r.daily.map((d) => d.views)),
    points = r.daily
      .map(
        (d, i) =>
          `${20 + (i / Math.max(1, r.daily.length - 1)) * 760},${150 - (d.views / max) * 120}`,
      )
      .join(" ");
  return (
    <div className="metrics-workspace">
      <div className="metrics-intro">
        <div>
          <span className="eyebrow">RESULTADOS QUE VOCÊ PODE ACOMPANHAR</span>
          <h2>{selected?.name || "Publicidade e parcerias"}</h2>
          <p>Dados próprios do portal, por peça, período e posição.</p>
        </div>
        <a className="button" href={`${base}/pdf?${params}`}>
          Baixar relatório PDF
        </a>
      </div>
      <form action={base} className="panel metrics-filters">
        <label>
          De
          <input type="date" name="from" defaultValue={f.from} required />
        </label>
        <label>
          Até
          <input type="date" name="until" defaultValue={f.until} required />
        </label>
        <label>
          Tipo
          <select name="kind" defaultValue={f.kind}>
            <option value="all">Publicidade e parceiros</option>
            <option value="campaign">Campanhas</option>
            <option value="partner">Parceiros</option>
          </select>
        </label>
        <label>
          Peça
          <select name="item" defaultValue={f.item}>
            <option value="">Todas as peças</option>
            {data.catalog.map((i) => (
              <option key={i.kind + i.id} value={i.id}>
                {i.name} · {i.kind === "campaign" ? "Campanha" : "Parceiro"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Investimento no período (opcional)
          <input
            type="number"
            name="investment"
            min={0}
            max={100000000}
            step="0.01"
            defaultValue={f.investment}
            placeholder="R$"
          />
        </label>
        <button>Aplicar filtros</button>
      </form>
      <div className="metric-cards">
        {cards.map(([label, value, hint]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <div className="metrics-two-columns">
        <section className="panel metric-chart">
          <h3>Evolução das visualizações</h3>
          {t.served > 0 ? (
            <>
              <svg
                viewBox="0 0 800 180"
                role="img"
                aria-label="Visualizações por dia"
              >
                <line x1="20" y1="150" x2="780" y2="150" stroke="#d9e5dc" />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#285e45"
                  strokeWidth="3"
                />
              </svg>
              <div className="metric-chart-labels">
                <span>{f.from}</span>
                <span>{f.until}</span>
              </div>
            </>
          ) : (
            <p className="muted">
              A coleta começa quando leitores visualizam as peças publicadas.
              Nenhum dado é simulado.
            </p>
          )}
        </section>
        <section className="panel">
          <h3>Vídeos e interação</h3>
          <dl className="metric-definition-list">
            {[
              ["Reproduções de vídeo", number(t.video_starts)],
              [
                "25% / 50% / 75%",
                `${number(t.video25)} / ${number(t.video50)} / ${number(t.video75)}`,
              ],
              ["Conclusões", number(t.completions)],
              [
                "Taxa de conclusão",
                percent(ratio(t.completions, t.video_starts)),
              ],
              ["Tempo assistido", `${number(Math.round(t.watch_seconds))} s`],
              ["Cliques em chamadas", number(t.cta)],
              ["Sessões com visualização", number(t.sessions)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="field-hint">
            Reprodução e progresso são medidos em vídeos enviados. Players
            externos não compartilham esses dados.
          </p>
        </section>
      </div>
      {f.investment !== undefined && (
        <section className="panel">
          <h3>Eficiência do investimento informado</h3>
          <div className="metric-budget">
            <span>
              Investimento <strong>{money(f.investment)}</strong>
            </span>
            <span>
              Custo por clique <strong>{money(data.cpc)}</strong>
            </span>
            <span>
              Custo por mil exibições <strong>{money(data.cpm)}</strong>
            </span>
          </div>
          <p className="field-hint">
            Cálculos feitos com o valor informado para este período. Não
            representam faturamento confirmado.
          </p>
        </section>
      )}
      <section className="panel">
        <h3>Resultados por peça</h3>
        <div className="metrics-table-scroll">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Tipo</th>
                <th>Exibições</th>
                <th>Visualizações</th>
                <th>Alcance</th>
                <th>Cliques</th>
                <th>CTR</th>
                <th>Relatório</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i) => {
                const q = new URLSearchParams(params);
                q.set("item", i.item_id);
                q.set("kind", i.kind);
                return (
                  <tr key={i.kind + i.item_id}>
                    <td>
                      {i.name}
                      {i.demo && (
                        <small className="demo-badge">
                          Demonstração · fora da coleta
                        </small>
                      )}
                      {i.mediaType === "google" && (
                        <small>Google · cliques oficiais não disponíveis</small>
                      )}
                    </td>
                    <td>{i.kind === "campaign" ? "Campanha" : "Parceiro"}</td>
                    <td>{number(i.served)}</td>
                    <td>{number(i.views)}</td>
                    <td>{number(i.reach)}</td>
                    <td>{i.mediaType === "google" ? "—" : number(i.clicks)}</td>
                    <td>
                      {i.mediaType === "google"
                        ? "—"
                        : percent(ratio(i.clicks, i.served))}
                    </td>
                    <td>
                      <Link href={`${base}?${q}`}>Detalhar</Link> ·{" "}
                      <a href={`${base}/pdf?${q}`}>PDF</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!r.items.length && (
          <p className="muted">Nenhuma peça cadastrada neste período.</p>
        )}
      </section>
      <div className="metrics-dimensions">
        {[
          ["device", "Dispositivos"],
          ["source", "Origem dos acessos"],
          ["page", "Páginas"],
          ["placement", "Posições"],
        ].map(([dimension, title]) => (
          <section className="panel" key={dimension}>
            <h3>{title}</h3>
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>{title}</th>
                  <th>Visualizações</th>
                  <th>Cliques</th>
                </tr>
              </thead>
              <tbody>
                {r.dimensions
                  .filter((d) => d.dimension === dimension)
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 20)
                  .map((d) => (
                    <tr key={d.label}>
                      <td>
                        {dimension === "placement"
                          ? placementLabel(d.label, portal.home_published)
                          : {
                              direto: "Direto",
                              interno: "Navegação interna",
                              desktop: "Computador",
                              mobile: "Celular",
                              tablet: "Tablet",
                            }[d.label] || d.label}
                      </td>
                      <td>{number(d.views)}</td>
                      <td>{number(d.clicks)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="field-hint">
        Horário de Brasília. Identificadores anônimos do navegador estimam
        alcance; bloqueadores e recusas de rastreamento podem reduzir a
        contagem. Demonstrações e prévias não contam. Métricas do Google são
        próprias da plataforma; cliques internos, receita e conversões de
        anunciantes exigem integração com seus provedores e não são estimados
        aqui.
      </p>
    </div>
  );
}
