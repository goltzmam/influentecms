export type PortalAddressDomain = {
  hostname: string;
  verified: boolean;
  portal_id?: string | null;
};
export function portalUrl(
  portal: { id?: string; slug: string },
  domains: PortalAddressDomain[] = [],
  suffix = "",
) {
  const connected = domains.find(
    (d) =>
      d.verified &&
      !d.hostname.endsWith(".vercel.app") &&
      (d.portal_id === undefined || d.portal_id === portal.id) &&
      /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,63}$/i.test(d.hostname),
  );
  return connected
    ? `https://${connected.hostname}${suffix}`
    : `/p/${portal.slug}${suffix}`;
}
