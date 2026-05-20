export type RuntimeSiteOption = {
  label: string;
  storeDomain: string;
};

export type RuntimeSiteCredential = {
  label?: string;
  storeDomain: string;
  adminAccessToken: string;
};

export type RuntimeSiteConfigMap = Record<string, RuntimeSiteCredential>;

export function normalizeStoreDomain(storeDomain: string): string {
  return storeDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim().toLowerCase();
}

export function buildRuntimeSiteConfigMap(
  siteConfigs: unknown,
): RuntimeSiteConfigMap {
  if (!siteConfigs || typeof siteConfigs !== "object" || Array.isArray(siteConfigs)) {
    return {};
  }

  const out: RuntimeSiteConfigMap = {};

  for (const value of Object.values(siteConfigs)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const storeDomain = normalizeStoreDomain(String(value.storeDomain ?? ""));
    const adminAccessToken = String(value.adminAccessToken ?? "").trim();
    const label = String(value.label ?? "").trim();

    if (!storeDomain || !adminAccessToken) {
      continue;
    }

    out[storeDomain] = {
      ...(label ? { label } : {}),
      storeDomain,
      adminAccessToken,
    };
  }

  return out;
}
