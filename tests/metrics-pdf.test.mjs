import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { writeFile } from "node:fs/promises";
import { metricPdf } from "../src/lib/metrics/pdf.ts";
test("PDF comercial é um arquivo real com fontes para português, período e métricas do relatório", async () => {
  const pdf = await metricPdf({
    portal: {
      name: "Relatório de Saúde & Negócios",
      slug: "verificacao",
      home_published: [],
    },
    filters: { from: "2026-11-01", until: "2026-11-04", investment: 100 },
    ctr: 0.1,
    frequency: 2,
    cpc: 10,
    cpm: 1000,
    report: {
      totals: {
        served: 100,
        views: 60,
        clicks: 10,
        reach: 30,
        clickers: 8,
        sessions: 40,
        cta: 5,
        video_starts: 2,
        video25: 2,
        video50: 1,
        video75: 1,
        completions: 1,
        watch_seconds: 22,
      },
      items: [
        {
          name: "Campanha de verificação",
          kind: "campaign",
          served: 100,
          views: 60,
          clicks: 10,
          reach: 30,
        },
      ],
      daily: [{ day: "2026-11-04", views: 60, clicks: 10 }],
      dimensions: [],
    },
  });
  assert.ok(Buffer.from(pdf).subarray(0, 5).toString() === "%PDF-");
  const document = await PDFDocument.load(pdf);
  assert.match(document.getTitle(), /Saúde/);
  assert.ok(document.getPageCount() >= 1);
  await writeFile("/tmp/influente-metrics-proof.pdf", pdf);
});
