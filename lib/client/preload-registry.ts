/**
 * 客户端 CDN / 异步资源预加载注册表。
 *
 * 流程：页面挂载 → preload() 后台并行加载 → 成功则静默就绪；
 * 使用时 getAll() 直接取缓存；失败可 retry()，仅错误态可感知。
 */

export type PreloadStatus = "idle" | "loading" | "ready" | "error";

export type PreloadSnapshot = {
  status: PreloadStatus;
  error: string | null;
};

type RegistryConfig = Record<string, () => Promise<unknown>>;

type RegistryValues<T extends RegistryConfig> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export function createPreloadRegistry<const T extends RegistryConfig>(resources: T) {
  type Values = RegistryValues<T>;

  let snapshot: PreloadSnapshot = { status: "idle", error: null };
  const listeners = new Set<() => void>();
  const cache = new Map<keyof T, Promise<unknown>>();
  let preloadPromise: Promise<void> | null = null;

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setSnapshot = (next: PreloadSnapshot) => {
    snapshot = next;
    emit();
  };

  const loadResource = <K extends keyof T>(key: K): Promise<Values[K]> => {
    if (!cache.has(key)) {
      cache.set(key, resources[key]());
    }

    return cache.get(key)! as Promise<Values[K]>;
  };

  const preload = (): Promise<void> => {
    if (snapshot.status === "ready") {
      return Promise.resolve();
    }

    if (preloadPromise) {
      return preloadPromise;
    }

    setSnapshot({ status: "loading", error: null });

    preloadPromise = Promise.all(
      (Object.keys(resources) as (keyof T)[]).map((key) => loadResource(key)),
    )
      .then(() => {
        setSnapshot({ status: "ready", error: null });
      })
      .catch((error: unknown) => {
        cache.clear();
        preloadPromise = null;

        const message =
          error instanceof Error ? error.message : "客户端资源加载失败，请检查网络";

        setSnapshot({ status: "error", error: message });
        throw error;
      });

    return preloadPromise;
  };

  const getAll = async (): Promise<Values> => {
    await preload();

    const keys = Object.keys(resources) as (keyof T)[];
    const entries = await Promise.all(
      keys.map(async (key) => [key, await loadResource(key)] as const),
    );

    return Object.fromEntries(entries) as Values;
  };

  const retry = (): Promise<void> => {
    cache.clear();
    preloadPromise = null;
    setSnapshot({ status: "idle", error: null });
    return preload();
  };

  const getSnapshot = (): PreloadSnapshot => snapshot;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { preload, getAll, retry, getSnapshot, subscribe };
}
