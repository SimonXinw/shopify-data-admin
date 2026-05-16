import type { ShopifyCart } from "@/lib/shopify/types-storefront";

export type ShopifyCartBuyerIdentityUpdate = {
  data: { cartBuyerIdentityUpdate: { cart: ShopifyCart } };
  variables: {
    cartId: string;
    buyerIdentity?: {
      countryCode?: string;
      customerAccessToken?: string;
      email?: string;
    };
  };
};

export type ShopifyCartDiscountCodesUpdate = {
  data: { cartDiscountCodesUpdate: { cart: ShopifyCart } };
  variables: {
    cartId: string;
    discountCodes: Array<string>;
  };
};
