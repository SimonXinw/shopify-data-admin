import cartFragment from "../fragments/cart";

export const getCartQuery = /* GraphQL */ `
  query getCart($cartId: ID!, $consent: VisitorConsent) @inContext(visitorConsent: $consent) {
    cart(id: $cartId) {
      ...cart
    }
  }
  ${cartFragment}
`;
