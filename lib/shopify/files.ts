import "server-only";

import { type RuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { SHOPIFY_FILE_BATCH_LIMIT } from "@/lib/constants/shopify";
import { shopifyAdminRequest } from "@/lib/shopify/admin-client";

type UploadResultItem = {
  fileName: string;
  mimeType: string;
  size: number;
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  fileStatus?: string;
  message?: string;
};

type StagedTargetParameter = {
  name: string;
  value: string;
};

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: StagedTargetParameter[];
};

type StagedUploadData = {
  stagedUploadsCreate: {
    stagedTargets: StagedTarget[];
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type FileCreateNode = {
  id: string;
  fileStatus: string;
  alt?: string | null;
  image?: { url: string } | null;
  preview?: { image?: { url: string | null } | null } | null;
};

type FileCreateData = {
  fileCreate: {
    files: FileCreateNode[];
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type FileNodeData = {
  node:
    | {
        id: string;
        fileStatus: string;
        image?: { url: string | null } | null;
        preview?: { image?: { url: string | null } | null } | null;
      }
    | null;
};

const STAGED_UPLOADS_CREATE_MUTATION = `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
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
        ... on GenericFile {
          preview {
            image {
              url
            }
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
      ... on GenericFile {
        id
        fileStatus
        preview {
          image {
            url
          }
        }
      }
    }
  }
`;

function validateIncomingFiles(files: File[]): void {
  if (files.length < 1) {
    throw new Error("请先选择至少一个文件。");
  }

  if (files.length > SHOPIFY_FILE_BATCH_LIMIT) {
    throw new Error(`单次最多上传 ${SHOPIFY_FILE_BATCH_LIMIT} 个文件。`);
  }
}

/** 浏览器未填 MIME 或误报为 octet-stream 时，按扩展名补全，便于 Shopify 分段上传校验。 */
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

function resolveMimeTypeForUpload(file: File): string {
  const fromBrowser = file.type.trim();
  if (fromBrowser && fromBrowser !== "application/octet-stream") {
    return fromBrowser;
  }

  const lower = file.name.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex < 0) {
    return fromBrowser || "application/octet-stream";
  }

  const ext = lower.slice(dotIndex);
  return IMAGE_MIME_BY_EXTENSION[ext] ?? (fromBrowser || "application/octet-stream");
}

function getContentTypeByMime(mimeType: string): "IMAGE" | "VIDEO" {
  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  return "IMAGE";
}

async function uploadBinaryToStagedTarget(target: StagedTarget, file: File): Promise<void> {
  const payload = new FormData();

  for (const param of target.parameters) {
    payload.append(param.name, param.value);
  }

  payload.append("file", file, file.name);

  const uploadResponse = await fetch(target.url, {
    method: "POST",
    body: payload,
  });

  if (!uploadResponse.ok) {
    throw new Error(`上传二进制失败，HTTP ${uploadResponse.status}`);
  }
}

function pickReturnedFileUrl(node: FileCreateNode): string | undefined {
  if (node.image?.url) {
    return node.image.url;
  }

  const previewUrl = node.preview?.image?.url;
  if (previewUrl) {
    return previewUrl;
  }

  return undefined;
}

function pickNodeUrl(node: FileNodeData["node"]): string | undefined {
  if (!node) {
    return undefined;
  }

  if (node.image?.url) {
    return node.image.url;
  }

  const previewUrl = node.preview?.image?.url;
  if (previewUrl) {
    return previewUrl;
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pollFileReadyState({
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
  let latestStatus = initialStatus;
  let latestUrl = initialUrl;

  if (latestStatus === "READY" && latestUrl) {
    return { fileStatus: latestStatus, fileUrl: latestUrl };
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

    latestStatus = nodeData.node.fileStatus;
    latestUrl = pickNodeUrl(nodeData.node) ?? latestUrl;

    if (latestStatus === "READY" && latestUrl) {
      break;
    }
  }

  return { fileStatus: latestStatus, fileUrl: latestUrl };
}

export async function batchUploadFilesToShopify({
  siteCode,
  files,
  altPrefix,
  customSiteConfigs,
}: {
  siteCode: string;
  files: File[];
  altPrefix?: string;
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<UploadResultItem[]> {
  validateIncomingFiles(files);

  const results: UploadResultItem[] = [];

  for (const file of files) {
    const mimeType = resolveMimeTypeForUpload(file);
    const item: UploadResultItem = {
      fileName: file.name,
      mimeType,
      size: file.size,
      success: false,
    };

    try {
      const stagedUploadInput = [
        {
          resource: "FILE",
          filename: file.name,
          mimeType,
          fileSize: String(file.size),
          httpMethod: "POST",
        },
      ];

      const stagedData = await shopifyAdminRequest<StagedUploadData>({
        storeDomain: siteCode,
        query: STAGED_UPLOADS_CREATE_MUTATION,
        variables: {
          input: stagedUploadInput,
        },
        customSiteConfigs,
      });

      const stagedErrors = stagedData.stagedUploadsCreate.userErrors;
      if (stagedErrors.length > 0) {
        item.message = stagedErrors[0].message;
        results.push(item);
        continue;
      }

      const stagedTarget = stagedData.stagedUploadsCreate.stagedTargets[0];
      if (!stagedTarget) {
        item.message = "未获取到 Shopify 分段上传地址。";
        results.push(item);
        continue;
      }

      await uploadBinaryToStagedTarget(stagedTarget, file);

      const fileCreateData = await shopifyAdminRequest<FileCreateData>({
        storeDomain: siteCode,
        query: FILE_CREATE_MUTATION,
        variables: {
          files: [
            {
              originalSource: stagedTarget.resourceUrl,
              contentType: getContentTypeByMime(mimeType),
              alt: altPrefix ? `${altPrefix}-${file.name}` : file.name,
            },
          ],
        },
        customSiteConfigs,
      });

      const createErrors = fileCreateData.fileCreate.userErrors;
      if (createErrors.length > 0) {
        item.message = createErrors[0].message;
        results.push(item);
        continue;
      }

      const createdFile = fileCreateData.fileCreate.files[0];
      if (!createdFile) {
        item.message = "fileCreate 成功但未返回文件数据。";
        results.push(item);
        continue;
      }

      item.success = true;
      item.fileId = createdFile.id;
      const initialFileStatus = createdFile.fileStatus;
      const initialFileUrl = pickReturnedFileUrl(createdFile);
      const readyState = await pollFileReadyState({
        siteCode,
        fileId: createdFile.id,
        initialStatus: initialFileStatus,
        initialUrl: initialFileUrl,
        customSiteConfigs,
      });

      item.fileStatus = readyState.fileStatus;
      item.fileUrl = readyState.fileUrl;
      item.message = readyState.fileUrl
        ? "已上传完成，可直接使用 CDN 地址。"
        : "已提交到 Shopify 处理队列，CDN 地址请稍后刷新查看。";
      results.push(item);
    } catch (error) {
      item.message = error instanceof Error ? error.message : "上传失败";
      results.push(item);
    }
  }

  return results;
}
