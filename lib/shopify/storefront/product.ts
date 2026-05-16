import { STOREFRONT_CACHE_TAGS } from "@/lib/shopify/cache-tags";
import { shopifyStorefrontFetch } from "@/lib/shopify/storefront-client";
import type { Connection, ShopifyProduct } from "@/lib/shopify/types-storefront";

async function storefrontGetProducts({
  siteCode,
  query,
  country,
}: {
  siteCode: string;
  query?: string;
  country?: string;
}) {
  const res = await shopifyStorefrontFetch<{
    data: { products: Connection<ShopifyProduct> };
  }>({
    query: `
  query getProducts(
    $query: String
    $country: CountryCode
  ) @inContext(country: $country) {
    products(query: $query, first: 100) {
      edges {
        node {
          id
          title
          handle
          description
        }
      }
    }
  }
    `,
    tags: [STOREFRONT_CACHE_TAGS.products],
    variables: {
      query,
      country,
    },
    siteCode,
  });

  return res.body.data.products;
}

export { storefrontGetProducts };
