export function GET() {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return new Response(
    `User-agent: *\nAllow: /p/\nDisallow: /painel\nDisallow: /login\nDisallow: /auth/\nSitemap: ${base}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
