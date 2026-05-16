export type Maybe<T> = T | null;

export type Connection<T> = {
  edges: Array<Edge<T>>;
};

export type Edge<T> = {
  node: T;
};

export type CartLineInput = {
  attributes?: Array<{ key: string; value: string }>;
  merchandiseId: string;
  quantity?: number;
  sellingPlanId?: string;
};

export type ParamsPriceRangeType = {
  maxVariantPrice: Money;
  minVariantPrice: Money;
};

interface CartItemBase {
  id: string;
  quantity: number;
  updateTime?: Date;
  cost: {
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    selectedOptions: {
      name: string;
      value: string;
    }[];
    product: Product;
  };
  visible?: boolean;
  discountAllocations: Array<{ discountedAmount: Money }>;
  paramsPriceRange?: ParamsPriceRangeType;
}

export interface CartItem extends CartItemBase {
  childrens?: Array<CartItemBase>;
}

export type Cart = Omit<ShopifyCart, "lines"> & {
  lines: CartItem[];
};

export type UpdateCartLine = {
  id: string;
  merchandiseId: string;
  quantity: number;
};

export type Image = {
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ProductVariantSelectedOption = {
  name: string;
  value: string;
};

export interface ProductVariantInterface {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: ProductVariantSelectedOption[];
  compareAtPrice: Money | null;
  price: Money;
  rentPriceThen?: Money;
  sku: string;
  quantityAvailable?: number;
  product: {
    title: string;
    category: { name: string; id: string };
  };
  image?: {
    src: string;
    imagesIndex: number;
  };
  metafield?: {
    id: string;
    key: string;
    namespace: string;
    value: string;
  };
  metafields?: Array<{
    id: string;
    key: string;
    namespace: string;
    value: string;
  } | null>;
}

export type ProductVariant = ProductVariantInterface;

export type SEO = {
  title: string | null;
  description: string | null;
};

export interface DiscountCodeItem {
  applicable: boolean;
  code: string;
}

export type CartAttributeInput = {
  key: string;
  value: string;
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
  };
  lines: Connection<CartItem>;
  totalQuantity: number;
  buyerIdentity?: {
    customer?: {
      email?: string;
    };
  };
  discountCodes: Array<DiscountCodeItem> | null;
  attributes: Array<CartAttributeInput>;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  availableForSale: boolean;
  title: string;
  description: string;
  descriptionHtml: string;
  publishedAt?: string | null;
  category: {
    name: string;
    id: string;
  };
  options: ProductOption[];
  priceRange: ParamsPriceRangeType;
  variants: Connection<ProductVariant>;
  featuredImage?: Image;
  images: Connection<Image>;
  seo: SEO;
  tags: string[];
  updatedAt: string;
  shippingPolicies?: {
    countries: {
      code: string;
      name: string;
    }[];
    transitTime: {
      min: number;
      max: number;
    };
    carrierServices: {
      title: string;
    }[];
  };
  metafield?: {
    id: string;
    key: string;
    namespace: string;
    value: string;
  };
  metafields?: Array<{
    id: string;
    key: string;
    namespace: string;
    value: string;
  } | null>;
};

export type Product = Omit<ShopifyProduct, "variants" | "images"> & {
  variants: ProductVariant[];
  images: Image[];
};

export type VisitorConsentInput = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  saleOfData: boolean;
};

export type ShopifyProductsOperation = {
  data: {
    products: Connection<ShopifyProduct>;
  };
  variables: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
    country?: string;
  };
};
