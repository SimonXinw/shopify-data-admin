"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  imageDownloadRuntime,
  type ImageDownloadRuntime,
} from "@/lib/tools/image-download/runtime";
import type { PreloadSnapshot } from "@/lib/client/preload-registry";

const SERVER_SNAPSHOT: PreloadSnapshot = { status: "idle", error: null };

/** 进页自动后台预加载；仅 error 时 toast，成功对用户无感知。 */
export const useImageDownloadRuntime = () => {
  const snapshot = useSyncExternalStore(
    imageDownloadRuntime.subscribe,
    imageDownloadRuntime.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const hasToastedErrorRef = useRef(false);

  useEffect(() => {
    void imageDownloadRuntime.preload();
  }, []);

  useEffect(() => {
    if (snapshot.status === "error" && !hasToastedErrorRef.current) {
      hasToastedErrorRef.current = true;
      toast.error(snapshot.error ?? "下载组件加载失败，请点击重试");
    }

    if (snapshot.status === "ready") {
      hasToastedErrorRef.current = false;
    }
  }, [snapshot.status, snapshot.error]);

  const retry = useCallback(() => {
    hasToastedErrorRef.current = false;
    void imageDownloadRuntime.retry();
  }, []);

  return {
    status: snapshot.status,
    error: snapshot.error,
    isError: snapshot.status === "error",
    retry,
    getRuntime: (): Promise<ImageDownloadRuntime> => imageDownloadRuntime.getAll(),
  };
};
