"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CustomSelect } from "@/components/data-entry/custom-select";

type SiteOption = {
  code: string;
  label: string;
  storeDomain: string;
};

type UploadResult = {
  fileName: string;
  mimeType: string;
  size: number;
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  fileStatus?: string;
  message?: string;
};

type UploadApiResponse = {
  successCount: number;
  failedCount: number;
  totalCount: number;
  results: UploadResult[];
};

const bytesToReadable = (value: number): string => {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      // 在异步任务或使用 refs 替代，但对于 URL.createObjectURL 直接 set 通常可接受
      // 这里禁用规则，因为我们需要将这个 Blob URL 传给 img
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition-shadow hover:border-indigo-300 hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 本地 Blob 预览不适合 next/image
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <svg
            className="h-6 w-6 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12z"
            />
          </svg>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-zinc-700" title={file.name}>
          {file.name}
        </span>
        <span className="text-xs text-zinc-500">{bytesToReadable(file.size)}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-800 text-white shadow-sm ring-2 ring-white hover:bg-zinc-700 group-hover:flex"
        title="移除文件"
      >
        <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" stroke="currentColor">
          <path d="M1 1l12 12m-12 0L13 1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function UploadToolClient({ siteOptions }: { siteOptions: SiteOption[] }) {
  const [selectedSiteCode, setSelectedSiteCode] = useState(siteOptions[0]?.code ?? "");
  const [altPrefix, setAltPrefix] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadSummary, setUploadSummary] = useState<UploadApiResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyStatusMap, setCopyStatusMap] = useState<Record<string, "success" | "error" | undefined>>({});

  const fileStats = useMemo(() => {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    return {
      count: files.length,
      totalBytes,
    };
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      setUploadSummary(null);
      setErrorMessage("");
    }
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = event.target.files ? Array.from(event.target.files) : [];
    if (pickedFiles.length > 0) {
      setFiles((prev) => [...prev, ...pickedFiles]);
      setUploadSummary(null);
      setErrorMessage("");
    }
    // 每次选完重置，这样即使选了同一个文件也能触发 change
    event.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const setCopyStatus = (key: string, status: "success" | "error") => {
    setCopyStatusMap((prev) => ({
      ...prev,
      [key]: status,
    }));

    setTimeout(() => {
      setCopyStatusMap((prev) => ({
        ...prev,
        [key]: undefined,
      }));
    }, 1800);
  };

  const handleCopyCdn = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(key, "success");
    } catch {
      setCopyStatus(key, "error");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSiteCode) {
      setErrorMessage("请选择站点。");
      return;
    }

    if (files.length < 1) {
      setErrorMessage("请先选择至少一张图片。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setUploadSummary(null);

    try {
      const payload = new FormData();
      payload.append("siteCode", selectedSiteCode);
      payload.append("altPrefix", altPrefix.trim());

      for (const file of files) {
        payload.append("files", file, file.name);
      }

      const response = await fetch("/api/tools/shopify/files/upload", {
        method: "POST",
        body: payload,
      });

      const body = (await response.json()) as UploadApiResponse & { message?: string };

      if (!response.ok) {
        setErrorMessage(body.message ?? "上传失败，请稍后重试。");
        return;
      }

      setUploadSummary(body);
      // 上传成功后清空待传列表
      setFiles([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上传失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">批量上传图片到 Shopify Files</h1>
        <p className="mt-2 text-sm text-zinc-500">
          通过此工具可将本地图片批量上传至 Shopify，自动处理格式并在后台生成分段上传任务。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start xl:grid-cols-[5fr_4fr]">
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
            <span>目标站点</span>
            <CustomSelect
              value={selectedSiteCode}
              options={siteOptions.map((site) => ({
                label: site.label,
                value: site.code,
                description: site.storeDomain,
              }))}
              onChange={(next) => setSelectedSiteCode(next)}
              className="h-11 cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 outline-none transition-shadow hover:border-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
            <div className="flex items-center gap-2">
              <span>Alt 前缀</span>
              <span className="text-xs font-normal text-zinc-400">（可选，将拼在文件名前）</span>
            </div>
            <input
              type="text"
              value={altPrefix}
              onChange={(event) => setAltPrefix(event.target.value)}
              placeholder="例如：campaign-2026-summer"
              className="h-11 rounded-lg border border-zinc-300 px-3 outline-none transition-shadow hover:border-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-zinc-800">
            选择图片 <span className="text-xs font-normal text-zinc-500">（支持批量与拖拽）</span>
          </span>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
              isDragging
                ? "scale-[1.01] border-indigo-500 bg-indigo-50 shadow-inner"
                : "border-zinc-300 bg-zinc-50 hover:border-indigo-400 hover:bg-zinc-100/50"
            }`}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*,.svg"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              title=""
            />
            <div className="pointer-events-none flex flex-col items-center space-y-3 text-center">
              <div
                className={`rounded-full p-4 transition-colors ${
                  isDragging ? "bg-indigo-100 text-indigo-600" : "bg-white text-zinc-400 shadow-sm"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <div className="text-sm text-zinc-600">
                <span className="font-semibold text-indigo-600">点击此处</span> 或将图片拖拽到这个区域
              </div>
              <div className="text-xs text-zinc-500">支持 JPEG, PNG, GIF, WebP, SVG 等格式</div>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50 p-5">
            <div className="flex items-center justify-between text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-900">待上传列表</span>
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                  {fileStats.count} 个文件
                </span>
                <span className="text-xs text-zinc-500">共 {bytesToReadable(fileStats.totalBytes)}</span>
              </div>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="cursor-pointer text-xs font-medium text-red-600 transition-colors hover:text-red-700 hover:underline"
              >
                清空列表
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {files.map((file, i) => (
                <FilePreview key={`${file.name}-${file.size}-${i}`} file={file} onRemove={() => removeFile(i)} />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || files.length === 0}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                正在上传到 Shopify...
              </>
            ) : (
              "开始上传"
            )}
          </button>
        </div>
          </form>
        </div>

        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
          <div className="text-lg font-semibold tracking-tight text-zinc-900">上传结果与历史</div>
          
          {!uploadSummary && !errorMessage ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              暂无上传记录。选择文件并提交后将在此展示。
            </div>
          ) : null}

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {uploadSummary && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            上传结果汇总
            <span className="ml-2 rounded-md bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
              共 {uploadSummary.totalCount} 个文件，成功 {uploadSummary.successCount}，失败 {uploadSummary.failedCount}
            </span>
          </div>

          <div className="grid gap-3">
            {uploadSummary.results.map((result, idx) => {
              const resultKey = `${result.fileId ?? result.fileName}-${idx}`;
              const copyStatus = copyStatusMap[resultKey];

              return (
              <div
                key={resultKey}
                className={`flex flex-col gap-2 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${
                  result.success
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${result.success ? "text-emerald-900" : "text-amber-900"}`}>
                      {result.fileName}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      ({bytesToReadable(result.size)})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-500">{result.mimeType}</span>
                    {result.fileStatus && (
                      <span className={`px-1.5 py-0.5 rounded-sm font-medium ${
                        result.success ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {result.fileStatus}
                      </span>
                    )}
                  </div>
                  {result.message && (
                    <div className={`text-xs mt-1 ${result.success ? "text-emerald-600" : "text-amber-700"}`}>
                      {result.message}
                    </div>
                  )}
                </div>

                {result.success && result.fileId && (
                  <div className="flex items-center gap-4 shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
                    <span className="text-xs font-mono text-zinc-400" title="Shopify File ID">{result.fileId}</span>
                    {result.fileUrl && (
                      <div className="flex flex-col items-end gap-1.5">
                        <a
                          href={result.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          查看图片
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <div className="max-w-[260px] truncate text-xs text-zinc-500" title={result.fileUrl}>
                          CDN: {result.fileUrl}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyCdn(result.fileUrl ?? "", resultKey);
                          }}
                          className={`inline-flex cursor-pointer items-center gap-1 text-xs underline decoration-dotted transition ${
                            copyStatus === "success"
                              ? "text-emerald-700"
                              : copyStatus === "error"
                                ? "text-red-600"
                                : "text-zinc-600 hover:text-zinc-800"
                          }`}
                        >
                          {copyStatus === "success"
                            ? "已复制"
                            : copyStatus === "error"
                              ? "复制失败"
                              : "复制 CDN 链接"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
