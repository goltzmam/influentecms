import { readFile } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !new URL(url).hostname.endsWith(".supabase.co"))
  throw new Error("Hosted project required");
const ref = new URL(url).hostname.split(".")[0],
  endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};
const patch = {
  mailer_templates_invite_content: await readFile(
    "supabase/templates/invite.html",
    "utf8",
  ),
  mailer_templates_magic_link_content: await readFile(
    "supabase/templates/magic-link.html",
    "utf8",
  ),
};
const response = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify(patch),
});
if (!response.ok) {
  const detail = (await response.text()).slice(0, 1200);
  console.log(JSON.stringify({check:"Access email configuration",status:"FAIL",http:response.status,validation:detail}));
  throw new Error(`Email configuration HTTP ${response.status}`);
}
const checked = await fetch(endpoint, { headers }),
  config = await checked.json();
if (
  !checked.ok ||
  !Object.entries(patch).every(([key, value]) => config[key] === value)
)
  throw new Error("Email template verification failed");
console.log(
  JSON.stringify({
    check: "Scanner-safe access email templates",
    status: "PASS",
    invite: true,
    magiclink: true,
    signupDisabled: config.disable_signup === true,
  }),
);
