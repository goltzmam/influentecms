"use client";
import type { AdSlot, Advertising } from "@/lib/advertising";
import { adFormats } from "@/lib/advertising";
import type { Campaign } from "@/lib/types";
import { AdCreative } from "./ad-creative";
import { GoogleAd } from "./google-ad";
export function AdSlotView({
  slot,
  campaigns,
  advertising,
  preview = false,
  sectionId,
}: {
  slot: AdSlot;
  campaigns: Campaign[];
  advertising?: Advertising;
  preview?: boolean;
  sectionId: string;
}) {
  if (slot.enabled === false) return null;
  const campaign =
    slot.kind === "google"
      ? undefined
      : campaigns.find((c) => c.id === slot.campaignId);
  const google =
    slot.kind === "google" &&
    advertising?.enabled &&
    /^ca-pub-\d{16}$/.test(advertising.publisherId || "") &&
    /^\d{1,20}$/.test(slot.googleSlot || "");
  if (!preview && !slot.showEmpty && !campaign && !google) return null;
  const size =
    slot.format === "custom"
      ? [slot.width || 300, slot.height || 250]
      : adFormats[slot.format];
  const label =
    slot.kind === "google"
      ? "Google Ads"
      : slot.kind === "sponsor"
        ? "Patrocinador"
        : "Publicidade";
  return (
    <div
      className={`portal-ad-slot slot-kind-${slot.kind} slot-zone-${slot.zone} ad-device-${slot.device || "all"}`}
      data-ad-slot-id={slot.id}
      data-ad-zone={slot.zone}
      data-section-id={sectionId}
      draggable={preview}
      onDragStart={
        preview
          ? (event) => {
              event.stopPropagation();
              event.dataTransfer.setData(
                "application/x-influente-slot",
                JSON.stringify({ id: slot.id, sectionId }),
              );
            }
          : undefined
      }
      style={{ width: size[0], maxWidth: "100%", background: slot.background }}
    >
      {slot.kind !== "sponsor" && (
        <span className="slot-disclosure">{label}</span>
      )}
      <div
        className="portal-ad-slot-body"
        style={{ aspectRatio: `${size[0]}/${size[1]}` }}
      >
        {campaign ? (
          <AdCreative
            campaign={{
              ...campaign,
              creative: {
                ...campaign.creative,
                format: slot.format === "sponsor" ? "custom" : slot.format,
                width: size[0],
                height: size[1],
                radius: 0,
              },
            }}
            preview={preview}
            disclosure={false}
          />
        ) : google && !preview ? (
          <GoogleAd
            publisherId={advertising!.publisherId!}
            slot={slot.googleSlot}
            responsive={slot.responsive !== false}
          />
        ) : (
          <div
            className="ad-slot-placeholder"
            style={{ background: slot.background }}
          >
            <strong>{label}</strong>
            {preview && (
              <small>
                {size[0]} × {size[1]} ·{" "}
                {slot.kind === "google"
                  ? "Conectar bloco do Google"
                  : campaign
                    ? "Peça selecionada"
                    : "Clique para configurar"}
              </small>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
