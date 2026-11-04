import { test } from "node:test";
import assert from "node:assert/strict";
import { mailDeliveryMessage } from "../src/lib/mail-errors.ts";
test("Falhas de configuração e cota não pedem que usuário fique reenviando", () => {
  for (const code of [
    "over_email_send_rate_limit",
    "over_request_rate_limit",
    "email_address_not_authorized",
    "unexpected_failure",
  ]) {
    const message = mailDeliveryMessage(code);
    assert.match(message, /Copiar convite/);
    assert.doesNotMatch(message, /instantes|Supabase|SMTP|Vercel|API/);
  }
  assert.match(mailDeliveryMessage("other", 429), /limite/);
});
