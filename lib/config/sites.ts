import "server-only";

type SiteDefinition = {
  label: string;
  storeDomainEnvName: string;
  adminAccessTokenEnvName: string;
  storefrontAccessTokenEnvName: string;
};

const CANDIDATE_SITE_DEFINITIONS: SiteDefinition[] = [
  {
    label: "Valerion JP 店铺",
    storeDomainEnvName: "JP_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "JP_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "JP_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion US 店铺",
    storeDomainEnvName: "US_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "US_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "US_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion EU 店铺",
    storeDomainEnvName: "EU_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "EU_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "EU_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion DE 店铺",
    storeDomainEnvName: "DE_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "DE_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "DE_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion FR 店铺",
    storeDomainEnvName: "FR_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "FR_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "FR_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion UK 店铺",
    storeDomainEnvName: "UK_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "UK_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "UK_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion CA 店铺",
    storeDomainEnvName: "CA_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "CA_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "CA_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion AU 店铺",
    storeDomainEnvName: "AU_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "AU_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "AU_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion Global 店铺",
    storeDomainEnvName: "GLOBAL_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "GLOBAL_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "GLOBAL_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
  {
    label: "Valerion CN 店铺",
    storeDomainEnvName: "CN_SHOPIFY_STORE_DOMAIN",
    adminAccessTokenEnvName: "CN_SHOPIFY_ADMIN_ACCESS_TOKEN",
    storefrontAccessTokenEnvName: "CN_SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  },
] as const;

export type SiteOption = {
  label: string;
  storeDomain: string;
};

export type ShopifySiteConfig = {
  label: string;
  storeDomain: string;
  adminAccessToken: string;
  storeDomainEnvName: string;
  adminAccessTokenEnvName: string;
  storefrontAccessTokenEnvName: string;
};

function readEnvByName(envName: string): string {
  return (process.env[envName] ?? "").trim();
}

export function listAvailableSiteOptions(): SiteOption[] {
  return CANDIDATE_SITE_DEFINITIONS.map((site) => {
    const storeDomain = readEnvByName(site.storeDomainEnvName).toLowerCase();
    const adminAccessToken = readEnvByName(site.adminAccessTokenEnvName);

    if (!storeDomain || !adminAccessToken) {
      return null;
    }

    return {
      label: site.label,
      storeDomain,
    } satisfies SiteOption;
  }).filter((item): item is SiteOption => item !== null);
}

export function getSiteConfigOrThrow(storeDomainRaw: string): ShopifySiteConfig {
  const normalizedStoreDomain = storeDomainRaw.trim().toLowerCase();
  if (!normalizedStoreDomain) {
    throw new Error("缺少店铺域名。");
  }

  for (const site of CANDIDATE_SITE_DEFINITIONS) {
    const storeDomain = readEnvByName(site.storeDomainEnvName).toLowerCase();
    if (storeDomain !== normalizedStoreDomain) {
      continue;
    }

    const adminAccessToken = readEnvByName(site.adminAccessTokenEnvName);
    if (!adminAccessToken) {
      throw new Error(`店铺 ${site.label} 缺少环境变量 ${site.adminAccessTokenEnvName}。`);
    }

    return {
      label: site.label,
      storeDomain,
      adminAccessToken,
      storeDomainEnvName: site.storeDomainEnvName,
      adminAccessTokenEnvName: site.adminAccessTokenEnvName,
      storefrontAccessTokenEnvName: site.storefrontAccessTokenEnvName,
    };
  }

  throw new Error(`未找到店铺域名映射：${storeDomainRaw}`);
}
