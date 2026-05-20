"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildRuntimeSiteConfigMap,
  normalizeStoreDomain,
  type RuntimeSiteConfigMap,
  type RuntimeSiteOption,
} from "@/lib/config/runtime-sites";

type CustomSiteRecord = {
  label: string;
  storeDomain: string;
  adminAccessToken: string;
};

type SavedPayload = {
  expireAt: number;
  sites: CustomSiteRecord[];
};

export type AddCustomSiteInput = {
  label: string;
  storeDomain: string;
  adminAccessToken: string;
};

const STORAGE_KEY = "shopify-custom-sites-v1";

function getTodayExpireAt(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

function sanitizeCustomSite(input: AddCustomSiteInput): CustomSiteRecord {
  return {
    label: input.label.trim(),
    storeDomain: normalizeStoreDomain(input.storeDomain),
    adminAccessToken: input.adminAccessToken.trim(),
  };
}

function readLocalSites(): CustomSiteRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedPayload;
    if (!parsed || !Array.isArray(parsed.sites) || typeof parsed.expireAt !== "number") {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    if (Date.now() > parsed.expireAt) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.sites
      .map((item) =>
        sanitizeCustomSite({
          label: String(item.label ?? ""),
          storeDomain: String(item.storeDomain ?? ""),
          adminAccessToken: String(item.adminAccessToken ?? ""),
        }),
      )
      .filter((item) => item.label && item.storeDomain && item.adminAccessToken);
  } catch {
    return [];
  }
}

function saveLocalSites(sites: CustomSiteRecord[]): void {
  const payload: SavedPayload = {
    expireAt: getTodayExpireAt(),
    sites,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function useCustomSiteOptions(serverSiteOptions: RuntimeSiteOption[]) {
  const [customSites, setCustomSites] = useState<CustomSiteRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const sites = readLocalSites();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 仅挂载时从 localStorage 初始化一次
    setCustomSites(sites);
    setIsReady(true);
  }, []);

  const siteOptions = useMemo(() => {
    const out: RuntimeSiteOption[] = [];
    const storeDomainSet = new Set<string>();

    for (const item of serverSiteOptions) {
      const storeDomain = normalizeStoreDomain(item.storeDomain);
      if (!storeDomain || storeDomainSet.has(storeDomain)) {
        continue;
      }

      out.push({
        label: item.label.trim() || storeDomain,
        storeDomain,
      });
      storeDomainSet.add(storeDomain);
    }

    for (const item of customSites) {
      if (storeDomainSet.has(item.storeDomain)) {
        continue;
      }

      out.push({
        label: item.label,
        storeDomain: item.storeDomain,
      });
      storeDomainSet.add(item.storeDomain);
    }

    return out;
  }, [customSites, serverSiteOptions]);

  const customSiteConfigMap = useMemo<RuntimeSiteConfigMap>(() => {
    const serverStoreDomainSet = new Set(
      serverSiteOptions.map((item) => normalizeStoreDomain(item.storeDomain)),
    );

    return buildRuntimeSiteConfigMap(
      customSites.reduce<Record<string, CustomSiteRecord>>((acc, item) => {
        // 防御性处理：即使 localStorage 与 env 出现相同店铺域名，也不允许覆盖 env。
        if (serverStoreDomainSet.has(item.storeDomain)) {
          return acc;
        }

        acc[item.storeDomain] = item;
        return acc;
      }, {}),
    );
  }, [customSites, serverSiteOptions]);

  const addCustomSite = (input: AddCustomSiteInput): { ok: true } | { ok: false; message: string } => {
    const site = sanitizeCustomSite(input);
    if (!site.label || !site.storeDomain || !site.adminAccessToken) {
      return { ok: false, message: "请完整填写店铺名称、店铺域名、Admin Token。" };
    }

    const storeExists = siteOptions.some((item) => normalizeStoreDomain(item.storeDomain) === site.storeDomain);
    if (storeExists) {
      return { ok: false, message: `店铺域名「${site.storeDomain}」已存在，请确认后重试。` };
    }

    const next = [...customSites, site];
    setCustomSites(next);
    saveLocalSites(next);
    return { ok: true };
  };

  return {
    isReady,
    siteOptions,
    customSiteConfigMap,
    addCustomSite,
  };
}
