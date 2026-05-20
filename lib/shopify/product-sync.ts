import "server-only";

import { type RuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import {
  SHOPIFY_PRODUCT_LIST_LIMIT,
  SHOPIFY_PRODUCT_SYNC_BATCH,
  SHOPIFY_PRODUCT_VARIANTS_BULK_CHUNK,
} from "@/lib/constants/shopify";
import { shopifyAdminRequest } from "@/lib/shopify/admin-client";

export type SiteProductListItem = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  updatedAt: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
  variantCount: number;
  hasMultipleVariants: boolean;
};

export type ProductSyncResultItem = {
  sourceProductId: string;
  sourceTitle: string;
  sourceHandle: string;
  targetStoreDomain: string;
  success: boolean;
  targetProductId?: string;
  targetHandle?: string;
  message?: string;
};

type ProductsListData = {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        updatedAt: string;
        tags: string[];
        featuredImage?: { url: string | null; altText?: string | null } | null;
        variants: {
          pageInfo: { hasNextPage: boolean };
          edges: Array<{ node: { id: string } }>;
        };
      };
    }>;
  };
};

type ProductByHandleData = {
  productByHandle: { id: string } | null;
};

type MetafieldNode = {
  namespace: string;
  key: string;
  type: string;
  value: string;
};

type SourceVariantNode = {
  sku?: string | null;
  barcode?: string | null;
  price: string;
  compareAtPrice?: string | null;
  taxable: boolean;
  inventoryPolicy: string;
  title?: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  image?: { url: string | null } | null;
  metafields: { edges: Array<{ node: MetafieldNode }> };
};

type SourceProductNode = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml?: string | null;
  vendor?: string | null;
  productType?: string | null;
  tags: string[];
  status: string;
  seo?: { title?: string | null; description?: string | null } | null;
  variants: { edges: Array<{ node: SourceVariantNode }> };
  metafields: { edges: Array<{ node: MetafieldNode }> };
  media: {
    nodes: Array<
      | {
          __typename?: string;
          alt?: string | null;
          image?: { url: string | null } | null;
        }
      | null
    >;
  };
  featuredImage?: { url: string | null; altText?: string | null } | null;
};

type ProductForSyncData = {
  product: SourceProductNode | null;
};

type ProductCreateData = {
  productCreate: {
    product: {
      id: string;
      handle: string;
      variants: { edges: Array<{ node: { id: string } }> };
    } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type ProductVariantsBulkCreateData = {
  productVariantsBulkCreate: {
    productVariants: Array<{ id: string }> | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type ProductVariantsBulkUpdateData = {
  productVariantsBulkUpdate: {
    productVariants: Array<{ id: string }> | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

const PRODUCTS_LIST_QUERY = `
  query ProductsList($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          status
          vendor
          updatedAt
          tags
          featuredImage {
            url
            altText
          }
          variants(first: 2) {
            pageInfo {
              hasNextPage
            }
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
    }
  }
`;

const PRODUCT_FOR_SYNC_QUERY = `
  query ProductForSync($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      tags
      status
      seo {
        title
        description
      }
      variants(first: 250) {
        edges {
          node {
            sku
            barcode
            price
            compareAtPrice
            taxable
            inventoryPolicy
            title
            selectedOptions {
              name
              value
            }
            image {
              url
            }
            metafields(first: 40) {
              edges {
                node {
                  namespace
                  key
                  type
                  value
                }
              }
            }
          }
        }
      }
      metafields(first: 80) {
        edges {
          node {
            namespace
            key
            type
            value
          }
        }
      }
      media(first: 20) {
        nodes {
          ... on MediaImage {
            alt
            image {
              url
            }
          }
        }
      }
      featuredImage {
        url
        altText
      }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `
  mutation ProductSyncCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        handle
        variants(first: 5) {
          edges {
            node {
              id
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

const PRODUCT_CREATE_WITH_MEDIA_MUTATION = `
  mutation ProductSyncCreateWithMedia($product: ProductCreateInput!, $media: [CreateMediaInput!]!) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        variants(first: 5) {
          edges {
            node {
              id
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

const PRODUCT_VARIANTS_BULK_CREATE_MUTATION = `
  mutation ProductVariantsBulkCreateSync(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
    $strategy: ProductVariantsBulkCreateStrategy
  ) {
    productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `
  mutation ProductVariantsBulkUpdateSync($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function normalizeTags(tags: string[] | string | null | undefined): string[] {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function productExistsByHandle(
  siteCode: string,
  handle: string,
  customSiteConfigs?: RuntimeSiteConfigMap,
): Promise<boolean> {
  const data = await shopifyAdminRequest<ProductByHandleData>({
    storeDomain: siteCode,
    query: PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
    customSiteConfigs,
  });

  return Boolean(data.productByHandle?.id);
}

/**
 * 目标站已占用 handle 时：依次尝试 `base-copy`、`base-copy-2`、…（与需求「-copy + 序号」一致）。
 */
export async function resolveUniqueProductHandle(
  siteCode: string,
  baseHandle: string,
  customSiteConfigs?: RuntimeSiteConfigMap,
): Promise<string> {
  const normalized = baseHandle.trim().toLowerCase();
  if (!normalized) {
    throw new Error("源产品 handle 为空，无法同步。");
  }

  if (!(await productExistsByHandle(siteCode, normalized, customSiteConfigs))) {
    return normalized;
  }

  let suffix = 1;
  let candidate = `${normalized}-copy`;

  while (await productExistsByHandle(siteCode, candidate, customSiteConfigs)) {
    suffix += 1;
    candidate = `${normalized}-copy-${suffix}`;
  }

  return candidate;
}

function buildCreateMediaInputs(product: SourceProductNode): Array<{
  originalSource: string;
  alt?: string;
  mediaContentType: "IMAGE";
}> {
  const seen = new Set<string>();
  const out: Array<{ originalSource: string; alt?: string; mediaContentType: "IMAGE" }> = [];

  const pushUrl = (url: string | null | undefined, alt?: string | null) => {
    if (!url) {
      return;
    }

    if (seen.has(url)) {
      return;
    }

    seen.add(url);
    out.push({
      originalSource: url,
      alt: alt?.trim() || undefined,
      mediaContentType: "IMAGE",
    });
  };

  for (const node of product.media.nodes) {
    if (!node?.image?.url) {
      continue;
    }

    pushUrl(node.image.url, node.alt);
  }

  pushUrl(product.featuredImage?.url ?? null, product.featuredImage?.altText);

  for (const edge of product.variants.edges) {
    pushUrl(edge.node.image?.url ?? null, product.title);
  }

  return out.slice(0, 20);
}

function buildProductOptionsFromVariants(
  variants: SourceVariantNode[],
): Array<{ name: string; values: Array<{ name: string }> }> {
  const optionOrder: string[] = [];
  const valueSets = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const opt of variant.selectedOptions) {
      const name = opt.name.trim();
      const value = opt.value.trim();
      if (!name || !value) {
        continue;
      }

      if (!valueSets.has(name)) {
        valueSets.set(name, new Set());
        optionOrder.push(name);
      }

      valueSets.get(name)!.add(value);
    }
  }

  return optionOrder.map((name) => ({
    name,
    values: Array.from(valueSets.get(name) ?? []).map((v) => ({ name: v })),
  }));
}

function isDefaultSingleVariant(variants: SourceVariantNode[]): boolean {
  if (variants.length !== 1) {
    return false;
  }

  const opts = variants[0].selectedOptions;
  if (opts.length === 0) {
    return true;
  }

  if (opts.length === 1 && opts[0].name === "Title" && opts[0].value === "Default Title") {
    return true;
  }

  return false;
}

function mapMetafieldsToCreateInput(edges: Array<{ node: MetafieldNode }>) {
  return edges.map(({ node }) => ({
    namespace: node.namespace,
    key: node.key,
    type: node.type,
    value: node.value,
  }));
}

function buildSeoInput(seo: SourceProductNode["seo"]) {
  if (!seo) {
    return undefined;
  }

  const title = seo.title?.trim();
  const description = seo.description?.trim();
  if (!title && !description) {
    return undefined;
  }

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function listSiteProducts(
  siteCode: string,
  options: { first?: number; searchQuery?: string; customSiteConfigs?: RuntimeSiteConfigMap } = {},
): Promise<SiteProductListItem[]> {
  const firstRaw = options.first ?? SHOPIFY_PRODUCT_LIST_LIMIT;
  const first = Math.min(SHOPIFY_PRODUCT_LIST_LIMIT, Math.max(1, Math.floor(firstRaw)));
  const searchQuery = options.searchQuery?.trim() ?? "";

  const variables: { first: number; query?: string | null } = { first };
  if (searchQuery.length > 0) {
    variables.query = searchQuery;
  } else {
    variables.query = null;
  }

  const data = await shopifyAdminRequest<ProductsListData>({
    storeDomain: siteCode,
    query: PRODUCTS_LIST_QUERY,
    variables,
    customSiteConfigs: options.customSiteConfigs,
  });

  return data.products.edges.map(({ node }) => {
    const variantEdges = node.variants.edges;
    const hasNext = node.variants.pageInfo.hasNextPage;
    const variantCount = hasNext ? variantEdges.length + 1 : variantEdges.length;

    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      status: node.status,
      vendor: node.vendor ?? "",
      updatedAt: node.updatedAt,
      tags: normalizeTags(node.tags),
      imageUrl: node.featuredImage?.url ?? "",
      imageAlt: node.featuredImage?.altText?.trim() || node.title,
      variantCount: Math.max(variantCount, variantEdges.length),
      hasMultipleVariants: hasNext || variantEdges.length > 1,
    };
  });
}

async function fetchSourceProduct(
  siteCode: string,
  productId: string,
  customSiteConfigs?: RuntimeSiteConfigMap,
): Promise<SourceProductNode> {
  const data = await shopifyAdminRequest<ProductForSyncData>({
    storeDomain: siteCode,
    query: PRODUCT_FOR_SYNC_QUERY,
    variables: { id: productId },
    customSiteConfigs,
  });

  if (!data.product) {
    throw new Error("源产品不存在或已被删除。");
  }

  return data.product;
}

async function createProductOnTarget(params: {
  targetSiteCode: string;
  product: SourceProductNode;
  handle: string;
  productOptions?: Array<{ name: string; values: Array<{ name: string }> }>;
  metafields: ReturnType<typeof mapMetafieldsToCreateInput>;
  media: ReturnType<typeof buildCreateMediaInputs>;
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<{ productId: string; firstVariantId: string | null; userError?: string }> {
  const { targetSiteCode, product, handle, productOptions, metafields, media, customSiteConfigs } = params;

  const productInput: Record<string, unknown> = {
    title: product.title,
    handle,
    descriptionHtml: product.descriptionHtml ?? "",
    vendor: product.vendor ?? "",
    productType: product.productType ?? "",
    tags: normalizeTags(product.tags),
    status: product.status,
  };

  const seo = buildSeoInput(product.seo);
  if (seo) {
    productInput.seo = seo;
  }

  if (productOptions && productOptions.length > 0) {
    productInput.productOptions = productOptions;
  }

  if (metafields.length > 0) {
    productInput.metafields = metafields;
  }

  const useMedia = media.length > 0;
  const data = await shopifyAdminRequest<ProductCreateData>({
    storeDomain: targetSiteCode,
    query: useMedia ? PRODUCT_CREATE_WITH_MEDIA_MUTATION : PRODUCT_CREATE_MUTATION,
    variables: useMedia ? { product: productInput, media } : { product: productInput },
    customSiteConfigs,
  });

  const payload = data.productCreate;
  if (payload.userErrors.length > 0) {
    return {
      productId: "",
      firstVariantId: null,
      userError: payload.userErrors.map((e) => e.message).join("；"),
    };
  }

  const created = payload.product;
  if (!created) {
    return {
      productId: "",
      firstVariantId: null,
      userError: "目标站点创建产品失败：未返回 product。",
    };
  }

  const firstVariantId = created.variants.edges[0]?.node.id ?? null;

  return { productId: created.id, firstVariantId, userError: undefined };
}

function buildBulkVariantInputs(variants: SourceVariantNode[]) {
  return variants.map((v) => {
    const optionValues = v.selectedOptions.map((o) => ({
      optionName: o.name,
      name: o.value,
    }));

    const row: Record<string, unknown> = {
      price: v.price,
      taxable: v.taxable,
      inventoryPolicy: v.inventoryPolicy,
      optionValues,
    };

    if (v.sku?.trim()) {
      row.sku = v.sku.trim();
    }

    if (v.barcode?.trim()) {
      row.barcode = v.barcode.trim();
    }

    if (v.compareAtPrice && v.compareAtPrice.trim()) {
      row.compareAtPrice = v.compareAtPrice.trim();
    }

    const vm = mapMetafieldsToCreateInput(v.metafields.edges);
    if (vm.length > 0) {
      row.metafields = vm;
    }

    return row;
  });
}

async function applyVariantsOnTarget(params: {
  targetSiteCode: string;
  productId: string;
  variants: SourceVariantNode[];
  firstVariantId: string | null;
  defaultSingle: boolean;
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<string | undefined> {
  const { targetSiteCode, productId, variants, firstVariantId, defaultSingle, customSiteConfigs } = params;

  if (variants.length < 1) {
    return "源产品没有变体，已跳过变体写入。";
  }

  if (defaultSingle && firstVariantId) {
    const v = variants[0];
    const updateRow: Record<string, unknown> = {
      id: firstVariantId,
      price: v.price,
      taxable: v.taxable,
      inventoryPolicy: v.inventoryPolicy,
    };

    if (v.sku?.trim()) {
      updateRow.sku = v.sku.trim();
    }

    if (v.barcode?.trim()) {
      updateRow.barcode = v.barcode.trim();
    }

    if (v.compareAtPrice && v.compareAtPrice.trim()) {
      updateRow.compareAtPrice = v.compareAtPrice.trim();
    }

    const vm = mapMetafieldsToCreateInput(v.metafields.edges);
    if (vm.length > 0) {
      updateRow.metafields = vm;
    }

    const data = await shopifyAdminRequest<ProductVariantsBulkUpdateData>({
      storeDomain: targetSiteCode,
      query: PRODUCT_VARIANTS_BULK_UPDATE_MUTATION,
      variables: {
        productId,
        variants: [updateRow],
      },
      customSiteConfigs,
    });

    if (data.productVariantsBulkUpdate.userErrors.length > 0) {
      return data.productVariantsBulkUpdate.userErrors.map((e) => e.message).join("；");
    }

    return undefined;
  }

  const inputs = buildBulkVariantInputs(variants);
  const chunks = chunkArray(inputs, SHOPIFY_PRODUCT_VARIANTS_BULK_CHUNK);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const variables: {
      productId: string;
      variants: Record<string, unknown>[];
      strategy?: string | null;
    } = {
      productId,
      variants: chunk,
    };

    if (i === 0) {
      variables.strategy = "REMOVE_STANDALONE_VARIANT";
    }

    const data = await shopifyAdminRequest<ProductVariantsBulkCreateData>({
      storeDomain: targetSiteCode,
      query: PRODUCT_VARIANTS_BULK_CREATE_MUTATION,
      variables,
      customSiteConfigs,
    });

    if (data.productVariantsBulkCreate.userErrors.length > 0) {
      return `变体批量创建（第 ${i + 1}/${chunks.length} 批）失败：${data.productVariantsBulkCreate.userErrors
        .map((e) => e.message)
        .join("；")}`;
    }
  }

  return undefined;
}

export async function syncProductsToSites({
  sourceSiteCode,
  targetSiteCodes,
  productIds,
  customSiteConfigs,
}: {
  sourceSiteCode: string;
  targetSiteCodes: string[];
  productIds: string[];
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<ProductSyncResultItem[]> {
  const normalizedSource = sourceSiteCode.trim().toLowerCase();
  const normalizedTargets = Array.from(
    new Set(
      targetSiteCodes
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.length > 0 && c !== normalizedSource),
    ),
  );

  if (normalizedTargets.length < 1) {
    throw new Error("请至少选择一个目标站点，且不能与源站点相同。");
  }

  const ids = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length < 1) {
    throw new Error("请至少选择一个产品。");
  }

  if (ids.length > SHOPIFY_PRODUCT_SYNC_BATCH) {
    throw new Error(`单次最多同步 ${SHOPIFY_PRODUCT_SYNC_BATCH} 个产品，请分批操作。`);
  }

  const results: ProductSyncResultItem[] = [];

  for (const productId of ids) {
    let sourceProduct: SourceProductNode | null = null;

    try {
      sourceProduct = await fetchSourceProduct(normalizedSource, productId, customSiteConfigs);
    } catch (error) {
      for (const targetSiteCode of normalizedTargets) {
        results.push({
          sourceProductId: productId,
          sourceTitle: productId,
          sourceHandle: "",
          targetStoreDomain: targetSiteCode,
          success: false,
          message: error instanceof Error ? error.message : "读取源产品失败",
        });
      }

      continue;
    }

    for (const targetSiteCode of normalizedTargets) {
      const row: ProductSyncResultItem = {
        sourceProductId: productId,
        sourceTitle: sourceProduct.title,
        sourceHandle: sourceProduct.handle,
        targetStoreDomain: targetSiteCode,
        success: false,
      };

      try {
        const targetHandle = await resolveUniqueProductHandle(
          targetSiteCode,
          sourceProduct.handle,
          customSiteConfigs,
        );
        const variants = sourceProduct.variants.edges.map((e) => e.node);
        const defaultSingle = isDefaultSingleVariant(variants);
        const productOptions = defaultSingle ? undefined : buildProductOptionsFromVariants(variants);

        if (!defaultSingle && (!productOptions || productOptions.length < 1)) {
          row.message = "无法从源产品解析规格选项，请检查变体的 selectedOptions。";
          results.push(row);
          continue;
        }

        const metafields = mapMetafieldsToCreateInput(sourceProduct.metafields.edges);
        const media = buildCreateMediaInputs(sourceProduct);

        let createResult = await createProductOnTarget({
          targetSiteCode,
          product: sourceProduct,
          handle: targetHandle,
          productOptions,
          metafields,
          media,
          customSiteConfigs,
        });

        if (createResult.userError && metafields.length > 0) {
          createResult = await createProductOnTarget({
            targetSiteCode,
            product: sourceProduct,
            handle: targetHandle,
            productOptions,
            metafields: [],
            media,
            customSiteConfigs,
          });
          row.message = `产品级元字段在目标站写入失败，已重试不包含产品 metafields。原因：${createResult.userError}`;
        }

        if (createResult.userError) {
          row.message = createResult.userError;
          results.push(row);
          continue;
        }

        const variantError = await applyVariantsOnTarget({
          targetSiteCode,
          productId: createResult.productId,
          variants,
          firstVariantId: createResult.firstVariantId,
          defaultSingle,
          customSiteConfigs,
        });

        if (variantError) {
          row.success = false;
          row.targetProductId = createResult.productId;
          row.targetHandle = targetHandle;
          row.message = `产品已创建，但变体未完全同步：${variantError}`;
          results.push(row);
          continue;
        }

        row.success = true;
        row.targetProductId = createResult.productId;
        row.targetHandle = targetHandle;
        row.message =
          targetHandle === sourceProduct.handle
            ? "已同步（handle 与源站一致）。注意：销售渠道、库存数量、组合售卖等需在各站后台单独核对。"
            : `已同步；目标站 handle 已避让为「${targetHandle}」。销售渠道与库存等需在各站后台单独核对。`;
        results.push(row);
      } catch (error) {
        row.message = error instanceof Error ? error.message : "同步失败";
        results.push(row);
      }
    }
  }

  return results;
}
