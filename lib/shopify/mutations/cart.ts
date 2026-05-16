import cartFragment from "../fragments/cart";

export const cartLinesAddMutation = /* GraphQL */ `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $consent: VisitorConsent)
  @inContext(visitorConsent: $consent) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...cart
      }
    }
  }
  ${cartFragment}
`;

export const createCartMutation = /* GraphQL */ `
  mutation createCart(
    $lineItems: [CartLineInput!]
    $buyerIdentity: CartBuyerIdentityInput
    $discountCodes: [String!]
    $consent: VisitorConsent
    $attributes: [AttributeInput!]
  ) @inContext(visitorConsent: $consent) {
    cartCreate(
      input: {
        lines: $lineItems
        buyerIdentity: $buyerIdentity
        discountCodes: $discountCodes
        attributes: $attributes
      }
    ) {
      cart {
        ...cart
      }
      userErrors {
        field
        message
      }
    }
  }
  ${cartFragment}
`;

export const editCartItemsMutation = /* GraphQL */ `
  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...cart
      }
    }
  }
  ${cartFragment}
`;

export const removeFromCartMutation = /* GraphQL */ `
  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...cart
      }
    }
  }
  ${cartFragment}
`;

export const cartBuyerIdentityUpdate = /* GraphQL */ `
  mutation cartBuyerIdentityUpdate($buyerIdentity: CartBuyerIdentityInput!, $cartId: ID!) {
    cartBuyerIdentityUpdate(buyerIdentity: $buyerIdentity, cartId: $cartId) {
      cart {
        ...cart
      }
      userErrors {
        field
        message
      }
    }
  }
  ${cartFragment}
`;

export const cartDiscountCodesUpdate = /* GraphQL */ `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...cart
      }
      userErrors {
        field
        message
      }
    }
  }
  ${cartFragment}
`;
