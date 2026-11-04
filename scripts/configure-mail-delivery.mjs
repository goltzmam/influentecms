// Run explicitly in production with the credentials supplied securely by the owner.
// Does not send messages, create accounts or reveal credentials.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !new URL(url).hostname.endsWith(".supabase.co"))
  throw new Error("Hosted project required");
const ref = new URL(url).hostname.split(".")[0],
  endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};
const current = await fetch(endpoint, { headers });
if (!current.ok)
  throw new Error(`Mail configuration lookup HTTP ${current.status}`);
const before = await current.json();
const sender = process.env.MAIL_FROM;
const provider = process.env.GMAIL_APP_PASSWORD
  ? "gmail"
  : process.env.RESEND_API_KEY
    ? "resend"
    : "smtp";
const host =
  provider === "gmail"
    ? "smtp.gmail.com"
    : provider === "resend"
      ? "smtp.resend.com"
      : process.env.SMTP_HOST;
const user =
  provider === "gmail"
    ? sender
    : provider === "resend"
      ? "resend"
      : process.env.SMTP_USER;
const pass =
  provider === "gmail"
    ? process.env.GMAIL_APP_PASSWORD.replace(/\s/g, "")
    : provider === "resend"
      ? process.env.RESEND_API_KEY
      : process.env.SMTP_PASS;
if (!host || !user || !pass || !sender) {
  console.log(
    JSON.stringify({
      check: "Email delivery configuration",
      status: before.smtp_host ? "EXISTING_PROVIDER" : "SETUP_REQUIRED",
      customProvider: !!before.smtp_host,
      missingSender: !sender,
      missingCredentials: !(host && user && pass),
      currentHourlyLimit: before.rate_limit_email_sent,
    }),
  );
  process.exit(0);
}
if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender))
  throw new Error("MAIL_FROM must be a verified sender email");
const port = Number(
  process.env.SMTP_PORT ||
    (provider === "resend" || provider === "gmail" ? 465 : 587),
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid SMTP port");
const limit = Number(process.env.AUTH_EMAIL_RATE_LIMIT || 30);
if (!Number.isInteger(limit) || limit < 2 || limit > 100)
  throw new Error("Hourly email limit must be between 2 and 100");
const patch = {
  smtp_host: host,
  smtp_port: String(port),
  smtp_user: user,
  smtp_pass: pass,
  smtp_admin_email: sender,
  smtp_sender_name: process.env.MAIL_FROM_NAME || "Influente",
  rate_limit_email_sent: limit,
};
const updated = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify(patch),
});
if (!updated.ok)
  throw new Error(`Mail configuration update HTTP ${updated.status}`);
const checked = await fetch(endpoint, { headers }),
  after = await checked.json();
if (
  !checked.ok ||
  after.smtp_host !== host ||
  after.smtp_admin_email !== sender ||
  after.disable_signup !== before.disable_signup
)
  throw new Error("Mail configuration verification failed");
console.log(
  JSON.stringify({
    check: "Email delivery configuration",
    status: "CONFIGURED",
    provider,
    hourlyLimit: after.rate_limit_email_sent,
    signupUnchanged: true,
    deliveryTested: false,
  }),
);
