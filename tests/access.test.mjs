import { test } from "node:test";
import assert from "node:assert/strict";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
for (const table of ["organizations", "organization_members", "media", "portal_contacts", "portal_subscribers"])
  test(`API real anônima não lê ${table}`, { skip: !url || !key }, async () => {
    const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key },
    });
    assert.ok([401, 403].includes(response.status), `HTTP ${response.status}`);
  });
test(
  "API real não expõe rascunho da homepage",
  { skip: !url || !key },
  async () => {
    const response = await fetch(`${url}/rest/v1/portals?select=home_draft`, {
      headers: { apikey: key },
    });
    assert.ok([401, 403].includes(response.status));
  },
);
