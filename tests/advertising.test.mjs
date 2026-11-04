import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseGoogleAdCode,
  adSlotSchema,
  advertisingSchema,
  referenceAdSlots,
} from "../src/lib/advertising.ts";
import { sectionsSchema } from "../src/lib/validation.ts";
test("Importa códigos oficiais AdSense sem armazenar ou executar JavaScript arbitrário", () => {
  const code =
    '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456" crossorigin="anonymous"></script><ins class="adsbygoogle" data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>';
  assert.deepEqual(parseGoogleAdCode(code), {
    publisherId: "ca-pub-1234567890123456",
    slot: "1234567890",
  });
  for (const bad of [
    '<script src="https://evil.example/a.js"></script>ca-pub-1234567890123456',
    '<script>document.cookie="bad";</script>ca-pub-1234567890123456',
    '<img onerror="alert(1)">ca-pub-1234567890123456',
    '<script src="https://pagead2.googlesyndication.com.evil.example/pagead/js/adsbygoogle.js"></script>ca-pub-1234567890123456',
  ])
    assert.throws(() => parseGoogleAdCode(bad));
});
test("Espaços de publicidade são independentes por seção e não fabricam dados do Google", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const slots = referenceAdSlots("lead", id);
  assert.deepEqual(
    slots.map((s) => s.kind),
    ["advertising", "google", "advertising"],
  );
  assert.ok(slots.every((s) => adSlotSchema.safeParse(s).success));
  assert.equal(slots.find((s) => s.kind === "google").googleSlot, undefined);
  const saved = sectionsSchema.parse([
    { id, type: "lead", title: "", adSlots: slots },
  ]);
  assert.equal(saved[0].adSlots.length, 3);
  assert.equal(
    adSlotSchema.safeParse({ ...slots[0], width: 99999 }).success,
    false,
  );
  assert.equal(
    advertisingSchema.safeParse({ publisherId: "ca-pub-malicious" }).success,
    false,
  );
  const all = ["lead", "category", "banner"].flatMap((type, i) =>
    referenceAdSlots(
      type,
      "00000000-0000-4000-8000-" + String(i + 1).padStart(12, "0"),
    ),
  );
  assert.equal(new Set(all.map((s) => s.id)).size, all.length);
});
