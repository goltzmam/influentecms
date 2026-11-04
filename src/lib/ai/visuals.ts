import sharp from "sharp";
import { join } from "node:path";
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function visualTheme(value: string) {
  const v = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /fitness|saude|saudefit|bem.estar|treino|esporte|corrida|movimento/.test(
    v,
  )
    ? "health"
    : /comida|aliment|nutri|receita|gastro/.test(v)
      ? "food"
      : /tech|tecnolog|digital|inteligencia|inov|startup/.test(v)
        ? "tech"
        : /moda|beleza|estilo|revista|cultura|arte/.test(v)
          ? "culture"
          : /viagem|turis|cidade|praia|natureza|ambiente/.test(v)
            ? "nature"
            : "business";
}
const themes: Record<string, string> = {
  health:
    '<circle cx="760" cy="250" r="56" fill="#f4c3a1"/><path d="M725 320L650 430L770 490L830 620M725 320L830 360L910 290M690 390L590 310M770 490L640 600L540 600" fill="none" stroke="#f7faf5" stroke-width="34" stroke-linecap="round"/><path d="M690 330L745 310L810 410L750 465L670 420Z" fill="ACCENT"/><rect x="270" y="540" width="140" height="30" rx="12" fill="#f8f4e9"/><rect x="255" y="490" width="35" height="130" rx="10" fill="ACCENT"/><rect x="390" y="490" width="35" height="130" rx="10" fill="ACCENT"/>',
  food: '<ellipse cx="760" cy="480" rx="260" ry="140" fill="#f1ebdd"/><ellipse cx="760" cy="460" rx="220" ry="115" fill="#5f9658"/><ellipse cx="680" cy="440" rx="90" ry="45" fill="#91ba63"/><ellipse cx="810" cy="470" rx="90" ry="50" fill="ACCENT"/><circle cx="760" cy="430" r="45" fill="#d96543"/><circle cx="860" cy="430" r="38" fill="#e3a85e"/><path d="M360 290L410 590M430 290L410 350L380 350L360 290" fill="none" stroke="#f1ebdd" stroke-width="18" stroke-linecap="round"/>',
  tech: '<rect x="410" y="210" width="540" height="350" rx="32" fill="#e7edf0"/><rect x="438" y="238" width="485" height="285" rx="15" fill="#18383e"/><rect x="470" y="275" width="165" height="210" rx="12" fill="ACCENT" opacity=".9"/><path d="M680 300H870M680 350H820M680 400H855M680 450H780" stroke="#eff7f2" stroke-width="15" stroke-linecap="round"/><path d="M365 580H990L940 620H410Z" fill="#d8e1dc"/><circle cx="1020" cy="220" r="70" fill="ACCENT"/>',
  culture:
    '<rect x="420" y="170" width="270" height="390" rx="130" fill="#edc5b7" transform="rotate(-15 550 360)"/><rect x="705" y="260" width="250" height="340" rx="20" fill="ACCENT" transform="rotate(15 800 400)"/><circle cx="570" cy="300" r="72" fill="#54417b"/><path d="M350 590Q500 420 690 610" fill="#f9e9d3"/><path d="M770 340L890 490L750 480Z" fill="#f7f0e6"/>',
  nature:
    '<circle cx="900" cy="230" r="85" fill="ACCENT"/><path d="M300 580L600 210L860 580Z" fill="#5c8d72"/><path d="M570 580L820 300L1090 580Z" fill="#e3e2c7"/><path d="M200 630Q600 470 1110 650L1110 750H200Z" fill="#8eae87"/><path d="M620 550Q760 600 720 760" fill="none" stroke="#bdd8e1" stroke-width="55"/>',
  business:
    '<rect x="420" y="390" width="130" height="240" rx="12" fill="#e9e0d1"/><rect x="600" y="300" width="130" height="330" rx="12" fill="ACCENT"/><rect x="780" y="200" width="130" height="430" rx="12" fill="#b4c8bd"/><path d="M390 330L610 190L720 210L930 95" fill="none" stroke="#f5f0e4" stroke-width="18" stroke-linecap="round"/><path d="M880 100L935 90L925 145" fill="none" stroke="#f5f0e4" stroke-width="18" stroke-linecap="round"/>',
};
export async function editorialIllustration({
  name,
  title,
  color,
  accent,
}: {
  name: string;
  title: string;
  color: string;
  accent: string;
}) {
  const subject = visualTheme(title);
  const scene = themes[
    subject === "business" ? visualTheme(name + " " + title) : subject
  ].replaceAll("ACCENT", accent);
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#152c2b"/></linearGradient></defs><rect width="1200" height="800" fill="url(#bg)"/><circle cx="1040" cy="100" r="380" fill="${accent}" opacity=".13"/><circle cx="220" cy="690" r="330" fill="#ffffff" opacity=".06"/><path d="M0 650Q300 400 620 650T1200 630V800H0Z" fill="#ffffff" opacity=".08"/><g transform="translate(-30,10)">${scene}</g><circle cx="190" cy="210" r="8" fill="${accent}"/><circle cx="220" cy="240" r="5" fill="#ffffff"/><path d="M245 170H310M278 138V203" stroke="${accent}" stroke-width="3"/></svg>`,
    ),
  )
    .webp({ quality: 90 })
    .toBuffer();
}
export async function demonstrationArt({
  name,
  color,
  accent,
  kind,
}: {
  name: string;
  color: string;
  accent: string;
  kind: "banner" | "sponsor" | "partner" | "vertical" | "rectangle";
}) {
  const [width, height] =
    kind === "banner"
      ? [1200, 300]
      : kind === "sponsor"
        ? [600, 240]
        : kind === "vertical"
          ? [600, 900]
          : kind === "rectangle"
            ? [600, 500]
            : [600, 420];
  const fontfile = join(process.cwd(), "assets/fonts/DejaVuSans-Bold.ttf");
  const text = ["banner", "vertical", "rectangle"].includes(kind)
    ? "Sua marca pode estar aqui."
    : kind === "sponsor"
      ? "Patrocínio demonstrativo"
      : "Sua próxima parceria";
  const copy = await sharp({
    text: {
      text: `<span foreground="#ffffff">${escape(text)}</span>`,
      font: "DejaVu Sans Bold " + (kind === "banner" ? 48 : 32),
      fontfile,
      width: Math.round(width * 0.64),
      height: Math.round(height * 0.45),
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  const label = await sharp({
    text: {
      text: `<span foreground="#ffffff">DEMONSTRAÇÃO · ${escape(name.slice(0, 42))}</span>`,
      font: "DejaVu Sans Bold 15",
      fontfile,
      width: Math.round(width * 0.75),
      height: 42,
      rgba: true,
    },
  })
    .resize({
      width: width - 70,
      height: 42,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><circle cx="${width * 0.95}" cy="${height * 0.15}" r="${height * 0.75}" fill="${accent}" opacity=".28"/><circle cx="${width * 0.88}" cy="${height * 0.35}" r="${height * 0.35}" fill="${accent}"/><rect x="20" y="15" width="${width - 40}" height="65" rx="12" fill="#102b27"/><path d="M${width * 0.82} ${height * 0.65}L${width * 0.91} ${height * 0.4}L${width * 0.96} ${height * 0.65}Z" fill="#ffffff" opacity=".8"/></svg>`,
  );
  return sharp(bg)
    .composite([
      { input: label, left: 35, top: 25 },
      { input: copy, left: 35, top: Math.round(height * 0.35) },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}
let modelsCache: { until: number; model: string | null } | undefined;
export async function generatedVisual(
  prompt: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API ||
    process.env.GOOGLE_API_KEY;
  if (!key) return null;
  const headers = { "x-goog-api-key": key, "Content-Type": "application/json" };
  try {
    if (!modelsCache || modelsCache.until < Date.now()) {
      const r = await fetcher(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {
          headers,
          signal: AbortSignal.any([
            AbortSignal.timeout(10000),
            ...(signal ? [signal] : []),
          ]),
        },
      );
      if (!r.ok) return null;
      const d = await r.json();
      const names = (d.models || [])
        .filter(
          (m: { name: string; supportedGenerationMethods?: string[] }) =>
            /gemini.*image/i.test(m.name) &&
            m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: { name: string }) => m.name.replace(/^models\//, ""));
      const chosen =
        process.env.GEMINI_IMAGE_MODEL &&
        names.includes(process.env.GEMINI_IMAGE_MODEL)
          ? process.env.GEMINI_IMAGE_MODEL
          : names.sort(
              (a: string, b: string) =>
                Number(!a.includes("flash")) - Number(!b.includes("flash")),
            )[0] || null;
      modelsCache = { until: Date.now() + 600000, model: chosen };
    }
    if (!modelsCache.model) return null;
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelsCache.model}:generateContent`,
      {
        method: "POST",
        headers,
        signal: AbortSignal.any([
          AbortSignal.timeout(35000),
          ...(signal ? [signal] : []),
        ]),
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Create one original premium editorial illustration, landscape 3:2. Subject: ${prompt.slice(0, 1400)}. Rich composition, carefully art directed, no typography, no logos, no watermarks. Conceptual illustrative scene, not documentary evidence. No identifiable real people, fabricated real-world events, medical promises or copied third-party photographs.`,
                },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType?: string } }) =>
        p.inlineData?.mimeType?.startsWith("image/"),
    );
    if (!part?.inlineData?.data || part.inlineData.data.length > 14000000)
      return null;
    return await sharp(Buffer.from(part.inlineData.data, "base64"), {
      limitInputPixels: 20000000,
    })
      .resize(1200, 800, { fit: "cover" })
      .webp({ quality: 87 })
      .toBuffer();
  } catch {
    return null;
  }
}
