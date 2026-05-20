import "server-only";

import { type RuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { SHOPIFY_FILE_BATCH_LIMIT } from "@/lib/constants/shopify";
import { shopifyAdminRequest } from "@/lib/shopify/admin-client";

export type SiteImageItem = {
  id: string;
  alt: string;
  fileStatus: string;
  fileUrl: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  fileName: string;
};

export type FileSyncResultItem = {
  sourceFileId: string;
  sourceFileName: string;
  targetStoreDomain: string;
  success: boolean;
  targetFileId?: string;
  targetFileStatus?: string;
  targetFileUrl?: string;
  message?: string;
};

type FilesListData = {
  files: {
    edges: Array<{
      node: {
        id: string;
        alt?: string | null;
        fileStatus: string;
        createdAt: string;
        updatedAt: string;
        image?: { url: string | null } | null;
        originalSource?: { url: string | null; fileSize?: number | null } | null;
      };
    }>;
  };
};

type SourceImageNodeData = {
  node:
    | {
        id: string;
        alt?: string | null;
        image?: { url: string | null } | null;
        originalSource?: { url: string | null; fileSize?: number | null } | null;
      }
    | null;
};

type FileCreateData = {
  fileCreate: {
    files: Array<{
      id: string;
      fileStatus: string;
      image?: { url: string | null } | null;
    }>;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type FileNodeData = {
  node:
    | {
        id: string;
        fileStatus: string;
        image?: { url: string | null } | null;
      }
    | null;
};

const LIST_SITE_IMAGES_QUERY = `
  query ListSiteImages($first: Int!) {
    files(first: $first, query: "media_type:IMAGE") {
      edges {
        node {
          ... on MediaImage {
            id
            alt
            fileStatus
            createdAt
            updatedAt
            image {
              url
            }
            originalSource {
              url
              fileSize
            }
          }
        }
      }
    }
  }
`;

const SOURCE_IMAGE_NODE_QUERY = `
  query SourceImageNode($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        id
        alt
        image {
          url
        }
        originalSource {
          url
          fileSize
        }
      }
    }
  }
`;

const FILE_CREATE_MUTATION = `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        ... on MediaImage {
          image {
            url
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FILE_NODE_QUERY = `
  query FileNodeById($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        id
        fileStatus
        image {
          url
        }
      }
    }
  }
`;

function inferFileNameFromUrl(url: string, id: string): string {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
    if (lastSegment) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    // 兜底使用 ID
  }

  return id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pollReadyFileState({
  siteCode,
  fileId,
  initialStatus,
  initialUrl,
  customSiteConfigs,
}: {
  siteCode: string;
  fileId: string;
  initialStatus: string;
  initialUrl?: string;
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<{ fileStatus: string; fileUrl?: string }> {
  let fileStatus = initialStatus;
  let fileUrl = initialUrl;

  if (fileStatus === "READY" && fileUrl) {
    return { fileStatus, fileUrl };
  }

  const RETRY_COUNT = 3;
  const RETRY_DELAY_MS = 900;

  for (let retry = 0; retry < RETRY_COUNT; retry += 1) {
    await sleep(RETRY_DELAY_MS);
    const nodeData = await shopifyAdminRequest<FileNodeData>({
      storeDomain: siteCode,
      query: FILE_NODE_QUERY,
      variables: { id: fileId },
      customSiteConfigs,
    });

    if (!nodeData.node) {
      continue;
    }

    fileStatus = nodeData.node.fileStatus;
    fileUrl = nodeData.node.image?.url ?? fileUrl;

    if (fileStatus === "READY" && fileUrl) {
      break;
    }
  }

  return { fileStatus, fileUrl };
}

export async function listSiteImages(
  siteCode: string,
  first = 250,
  options: { customSiteConfigs?: RuntimeSiteConfigMap } = {},
): Promise<SiteImageItem[]> {
  const normalizedFirst = Math.min(250, Math.max(1, Math.floor(first)));

  const data = await shopifyAdminRequest<FilesListData>({
    storeDomain: siteCode,
    query: LIST_SITE_IMAGES_QUERY,
    variables: {
      first: normalizedFirst,
    },
    customSiteConfigs: options.customSiteConfigs,
  });

  return data.files.edges
    .map((edge) => edge.node)
    .filter((node) => Boolean(node.image?.url))
    .map((node) => {
      const fileUrl = node.image?.url ?? "";
      return {
        id: node.id,
        alt: node.alt?.trim() || "",
        fileStatus: node.fileStatus,
        fileUrl,
        sizeBytes: node.originalSource?.fileSize ?? undefined,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        fileName: inferFileNameFromUrl(fileUrl, node.id),
      };
    });
}

export async function syncImagesToSite({
  sourceSiteCode,
  targetSiteCodes,
  fileIds,
  customSiteConfigs,
}: {
  sourceSiteCode: string;
  targetSiteCodes: string[];
  fileIds: string[];
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<FileSyncResultItem[]> {
  const normalizedTargetSiteCodes = Array.from(
    new Set(
      targetSiteCodes
        .map((code) => code.trim().toLowerCase())
        .filter((code) => code.length > 0 && code !== sourceSiteCode),
    ),
  );
  if (normalizedTargetSiteCodes.length < 1) {
    throw new Error("请至少选择一个目标站点，且不能与源站点相同。");
  }

  if (fileIds.length < 1) {
    throw new Error("请至少选择一个文件。");
  }

  if (fileIds.length > SHOPIFY_FILE_BATCH_LIMIT) {
    throw new Error(`单次最多同步 ${SHOPIFY_FILE_BATCH_LIMIT} 个文件。`);
  }

  const results: FileSyncResultItem[] = [];

  for (const sourceFileId of fileIds) {
    try {
      const sourceNodeData = await shopifyAdminRequest<SourceImageNodeData>({
        storeDomain: sourceSiteCode,
        query: SOURCE_IMAGE_NODE_QUERY,
        variables: { id: sourceFileId },
        customSiteConfigs,
      });

      if (!sourceNodeData.node) {
        for (const targetSiteCode of normalizedTargetSiteCodes) {
          results.push({
            sourceFileId,
            sourceFileName: sourceFileId,
            targetStoreDomain: targetSiteCode,
            success: false,
            message: "源文件不存在或不属于图片类型。",
          });
        }
        continue;
      }

      const sourceUrl = sourceNodeData.node.originalSource?.url ?? sourceNodeData.node.image?.url;
      if (!sourceUrl) {
        for (const targetSiteCode of normalizedTargetSiteCodes) {
          results.push({
            sourceFileId,
            sourceFileName: sourceFileId,
            targetStoreDomain: targetSiteCode,
            success: false,
            message: "源文件未返回可同步的 URL。",
          });
        }
        continue;
      }

      const sourceFileName = inferFileNameFromUrl(sourceUrl, sourceFileId);

      for (const targetSiteCode of normalizedTargetSiteCodes) {
        const result: FileSyncResultItem = {
          sourceFileId,
          sourceFileName,
          targetStoreDomain: targetSiteCode,
          success: false,
        };

        try {
          const fileCreateData = await shopifyAdminRequest<FileCreateData>({
            storeDomain: targetSiteCode,
            query: FILE_CREATE_MUTATION,
            variables: {
              files: [
                {
                  originalSource: sourceUrl,
                  contentType: "IMAGE",
                  alt: sourceNodeData.node.alt?.trim() || sourceFileName,
                },
              ],
            },
            customSiteConfigs,
          });

          const userErrors = fileCreateData.fileCreate.userErrors;
          if (userErrors.length > 0) {
            result.message = userErrors[0].message;
            results.push(result);
            continue;
          }

          const createdFile = fileCreateData.fileCreate.files[0];
          if (!createdFile) {
            result.message = "目标站点创建文件成功但未返回文件信息。";
            results.push(result);
            continue;
          }

          const readyState = await pollReadyFileState({
            siteCode: targetSiteCode,
            fileId: createdFile.id,
            initialStatus: createdFile.fileStatus,
            initialUrl: createdFile.image?.url ?? undefined,
            customSiteConfigs,
          });

          result.success = true;
          result.targetFileId = createdFile.id;
          result.targetFileStatus = readyState.fileStatus;
          result.targetFileUrl = readyState.fileUrl;
          result.message = readyState.fileUrl
            ? "同步完成，可直接使用目标站点 CDN 地址。"
            : "同步请求已提交，目标站点 CDN 地址稍后可见。";
          results.push(result);
        } catch (error) {
          result.message = error instanceof Error ? error.message : "同步失败";
          results.push(result);
        }
      }
    } catch (error) {
      for (const targetSiteCode of normalizedTargetSiteCodes) {
        results.push({
          sourceFileId,
          sourceFileName: sourceFileId,
          targetStoreDomain: targetSiteCode,
          success: false,
          message: error instanceof Error ? error.message : "同步失败",
        });
      }
    }
  }

  return results;
}
