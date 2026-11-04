import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accessDestination,
  confirmationLink,
  readAccessLink,
} from "../src/lib/access-link.ts";
test("Convite usa fragmento e só permite destino interno de painel", () => {
  const url = new URL(
    confirmationLink(
      "https://cms.example",
      "private-once-token",
      "invite",
      "//evil.example",
    ),
  );
  assert.equal(url.pathname, "/auth/callback");
  assert.equal(url.searchParams.has("token_hash"), false);
  assert.ok(url.hash.includes("token_hash="));
  assert.equal(url.searchParams.get("next"), "/painel");
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/painel/../login",
    "/painel?redirect=x",
  ])
    assert.equal(accessDestination(value), "/painel");
});
test("Confirmação aceita convites novos, links legados implícitos e código PKCE sem confundir sessão existente", () => {
  assert.deepEqual(
    readAccessLink(
      "https://cms.example/auth/callback?next=/painel/123#token_hash=once&type=invite",
    ).payload,
    { token_hash: "once", type: "invite", next: "/painel/123" },
  );
  assert.deepEqual(
    readAccessLink(
      "https://cms.example/auth/callback#access_token=access&refresh_token=refresh&type=invite",
    ).payload,
    { access_token: "access", refresh_token: "refresh", next: "/painel" },
  );
  assert.deepEqual(
    readAccessLink("https://cms.example/auth/callback?code=exchange").payload,
    { code: "exchange", next: "/painel" },
  );
  assert.equal(
    readAccessLink("https://cms.example/auth/callback#error_code=otp_expired")
      .providerError,
    "otp_expired",
  );
  assert.equal(
    readAccessLink("https://cms.example/auth/callback").payload,
    null,
  );
  assert.equal(
    readAccessLink(
      "https://cms.example/auth/callback#token_hash=x&type=recovery",
    ).payload,
    null,
  );
});
