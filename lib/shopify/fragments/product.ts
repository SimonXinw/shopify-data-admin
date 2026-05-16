import imageFragment from "./image";
import seoFragment from "./seo";

const productFragment = /* GraphQL */ `
  fragment product on Product {
    id
    handle
    availableForSale
    title
    description
    publishedAt
    descriptionHtml
    category {
      id
      name
    }
    options {
      id
      name
      values
    }
    priceRange {
      maxVariantPrice {
        amount
        currencyCode
      }
      minVariantPrice {
        amount
        currencyCode
      }
    }
    metafields(
      identifiers: [
        { namespace: "custom", key: "product_collection_name" }
        { namespace: "custom", key: "product_collection_name_link" }
      ]
    ) {
      id
      key
      value
      namespace
    }
    variants(first: 250) {
      edges {
        node {
          id
          title
          availableForSale
          product {
            category {
              name
              id
            }
            title
          }
          selectedOptions {
            name
            value
          }
          compareAtPrice {
            amount
            currencyCode
          }
          price {
            amount
            currencyCode
          }
          image {
            src
          }
          metafields(
            identifiers: [
              { namespace: "custom", key: "compare_price_json" }
              { namespace: "custom", key: "variant_desc_richtext" }
              { namespace: "custom", key: "coupon_json" }
              { namespace: "custom", key: "variantImages" }
              { namespace: "custom", key: "variant_main_image" }
              { namespace: "custom", key: "product_main_image" }
              { namespace: "custom", key: "product_collection_name" }
            ]
          ) {
            id
            key
            value
            namespace
          }
          quantityAvailable
          sku
        }
      }
    }
    featuredImage {
      ...image
    }
    images(first: 20) {
      edges {
        node {
          ...image
        }
      }
    }
    seo {
      ...seo
    }
    tags
    createdAt
    updatedAt
  }
  ${imageFragment}
  ${seoFragment}
`;

export default productFragment;
