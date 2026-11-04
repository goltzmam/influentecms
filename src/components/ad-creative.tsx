import { GoogleAd } from "./google-ad";
import { ArrowUpRight } from "lucide-react";
import type { Campaign, Partner } from "@/lib/types";
import { youtubeEmbed } from "@/lib/presentation";
import { safeLink } from "@/lib/links";
export function CreativeMedia({
  item,
  fit = "contain",
}: {
  item: Pick<Campaign, "name" | "image_url" | "creative">;
  fit?: "contain" | "cover";
}) {
  const config = item.creative || {};
  const embed = youtubeEmbed(config.videoUrl || "");
  return config.mediaType === "video" && config.videoUrl ? (
    embed ? (
      <iframe
        title={item.name}
        src={embed}
        loading="lazy"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <video
        controls
        preload="metadata"
        src={safeLink(config.videoUrl)}
        aria-label={item.name}
      />
    )
  ) : item.image_url ? (
    <img
      src={safeLink(item.image_url)}
      alt={config.alt || item.name}
      style={{ objectFit: config.fit || fit }}
      loading="lazy"
    />
  ) : (
    <div className="creative-placeholder" aria-hidden="true">
      {item.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
const formats: Record<string, [number, number]> = {
  billboard: [970, 250],
  leaderboard: [728, 90],
  rectangle: [300, 250],
  skyscraper: [300, 600],
  square: [300, 300],
  native: [600, 200],
};
export function AdCreative({
  campaign,
  preview = false,
  disclosure = true,
}: {
  campaign: Campaign;
  preview?: boolean;
  disclosure?: boolean;
}) {
  const c = campaign.creative || {},
    size = formats[c.format || ""] || [c.width || 970, c.height || 250];
  const custom = c.format && c.format !== "auto";
  return (
    <aside
      className={`public-ad ad-${campaign.position} premium-ad creative-${c.mediaType || "image"} ad-device-${c.device || "all"} format-${c.format || "auto"}`}
      data-campaign-id={campaign.id}
      style={{
        width: custom ? size[0] : undefined,
        maxWidth: "100%",
        marginLeft: c.align === "left" ? 0 : "auto",
        marginRight: c.align === "right" ? 0 : "auto",
        background: c.background,
        color: c.color,
        borderRadius: c.radius ?? 12,
      }}
    >
      {disclosure && <span className="advert-disclosure">Publicidade</span>}
      <div
        className="ad-creative-media"
        style={{
          aspectRatio: custom ? `${size[0]}/${size[1]}` : undefined,
        }}
      >
        {c.mediaType === "google" ? (
          preview ? (
            <div className="ad-slot-placeholder google-campaign-placeholder">
              Google Ads · prévia
            </div>
          ) : (
            <GoogleAd
              publisherId={c.googlePublisherId || ""}
              slot={c.googleSlot}
            />
          )
        ) : c.mediaType === "text" ? (
          <div className="ad-native-content">
            <strong>{campaign.name}</strong>
            <p>{c.description}</p>
          </div>
        ) : c.mediaType === "video" ? (
          <CreativeMedia item={campaign} />
        ) : (
          <a
            href={safeLink(campaign.link)}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            <CreativeMedia item={campaign} />
          </a>
        )}
      </div>
      {(c.cta || c.mediaType === "video" || c.mediaType === "text") &&
        campaign.link && (
          <a
            className="creative-cta"
            href={safeLink(campaign.link)}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            {c.cta || "Saiba mais"}{" "}
            <span aria-hidden="true">
              <ArrowUpRight size={15} />
            </span>
          </a>
        )}
    </aside>
  );
}
export function PartnerCard({
  partner,
  showName = true,
  fit = "contain",
}: {
  partner: Partner;
  showName?: boolean;
  fit?: "contain" | "cover";
}) {
  const c = partner.creative || {};
  return (
    <article className="premium-partner-card">
      <div className="partner-visual">
        {c.mediaType === "video" ? (
          <CreativeMedia item={partner} fit={fit} />
        ) : (
          <a
            href={safeLink(partner.link)}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={partner.name}
          >
            <CreativeMedia item={partner} fit={fit} />
          </a>
        )}
      </div>
      {(showName || c.description || c.cta) && (
        <div className="partner-card-copy">
          {showName && <h3>{partner.name}</h3>}
          {c.description && <p>{c.description}</p>}
          {partner.link && (
            <a
              href={safeLink(partner.link)}
              target="_blank"
              rel="sponsored noopener noreferrer"
            >
              {c.cta || "Conheça a marca"}{" "}
              <span aria-hidden="true">
                <ArrowUpRight size={15} />
              </span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}
