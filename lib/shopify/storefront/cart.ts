import { cartBuyerIdentityUpdate, cartDiscountCodesUpdate } from "@/lib/shopify/mutations/cart";
import { reshapeCart, shopifyStorefrontFetch } from "@/lib/shopify/storefront-client";
import type { Cart } from "@/lib/shopify/types-storefront";
import type { ShopifyCartBuyerIdentityUpdate, ShopifyCartDiscountCodesUpdate } from "./type";

export async function storefontCartBuyerIdentityUpdate({
  siteCode,
  cartId,
  countryCode,
  customerAccessToken,
  email,
}: {
  siteCode: string;
  cartId: string;
  countryCode: string;
  customerAccessToken?: string;
  email?: string;
}): Promise<Cart> {
  const buyerIdentity: Record<string, string | undefined> = {
    countryCode,
    email,
  };

  if (customerAccessToken) {
    buyerIdentity.customerAccessToken = customerAccessToken;
  }

  const res = await shopifyStorefrontFetch<ShopifyCartBuyerIdentityUpdate>({
    query: cartBuyerIdentityUpdate,
    cache: "no-store",
    variables: {
      cartId,
      buyerIdentity,
    },
    siteCode,
  });

  return reshapeCart(res.body.data.cartBuyerIdentityUpdate.cart);
}

export async function storefontCartDiscountCodesUpdate({
  siteCode,
  cartId,
  discountCodes,
}: {
  siteCode: string;
  cartId: string;
  discountCodes: Array<string>;
}): Promise<Cart> {
  const res = await shopifyStorefrontFetch<ShopifyCartDiscountCodesUpdate>({
    query: cartDiscountCodesUpdate,
    cache: "no-store",
    variables: {
      cartId,
      discountCodes,
    },
    siteCode,
  });

  return reshapeCart(res.body.data.cartDiscountCodesUpdate.cart);
}
