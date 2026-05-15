import "server-only";

const CANDIDATE_SITE_CODES = ["jp", "us", "eu", "de", "fr", "uk", "ca", "au", "global", "cn"] as const;

export type SiteCode = (typeof CANDIDATE_SITE_CODES)[number];

export type SiteOption = {
  code: SiteCode;
  label: string;
  storeDomain: string;
};

export type ShopifySiteConfig = {
  code: SiteCode;
  storeDomain: string;
  adminAccessToken: string;
};

const siteLabelMap: Record<SiteCode, string> = {
  jp: "JP 站点",
  us: "US 站点",
  eu: "EU 站点",
  de: "DE 站点",
  fr: "FR 站点",
  uk: "UK 站点",
  ca: "CA 站点",
  au: "AU 站点",
  global: "Global 站点",
  cn: "CN 站点",
};

function toEnvPrefix(code: SiteCode): string {
  return code.toUpperCase();
}

function readEnv(prefix: string, suffix: string): string {
  return (process.env[`${prefix}_${suffix}`] ?? "").trim();
}

export function listAvailableSiteOptions(): SiteOption[] {
  return CANDIDATE_SITE_CODES.map((code) => {
    const prefix = toEnvPrefix(code);
    const storeDomain = readEnv(prefix, "SHOPIFY_STORE_DOMAIN");
    const adminAccessToken = readEnv(prefix, "SHOPIFY_ADMIN_ACCESS_TOKEN");

    if (!storeDomain || !adminAccessToken) {
      return null;
    }

    return {
      code,
      label: siteLabelMap[code],
      storeDomain,
    } satisfies SiteOption;
  }).filter((item): item is SiteOption => item !== null);
}

export function getSiteConfigOrThrow(siteCodeRaw: string): ShopifySiteConfig {
  const siteCode = siteCodeRaw.toLowerCase() as SiteCode;

  if (!CANDIDATE_SITE_CODES.includes(siteCode)) {
    throw new Error(`不支持的站点标识: ${siteCodeRaw}`);
  }

  const prefix = toEnvPrefix(siteCode);
  const storeDomain = readEnv(prefix, "SHOPIFY_STORE_DOMAIN");
  const adminAccessToken = readEnv(prefix, "SHOPIFY_ADMIN_ACCESS_TOKEN");

  if (!storeDomain || !adminAccessToken) {
    throw new Error(`站点 ${siteCode} 缺少 SHOPIFY_STORE_DOMAIN 或 SHOPIFY_ADMIN_ACCESS_TOKEN`);
  }

  return {
    code: siteCode,
    storeDomain,
    adminAccessToken,
  };
}
