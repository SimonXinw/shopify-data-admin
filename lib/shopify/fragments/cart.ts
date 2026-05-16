import productFragment from "./product";

const cartFragment = /* GraphQL */ `
  fragment cart on Cart {
    id
    checkoutUrl
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    discountAllocations {
      discountedAmount {
        amount
        currencyCode
      }
    }
    discountCodes {
      applicable

      code
    }
    attributes {
      key
      value
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              selectedOptions {
                name
                value
              }
              product {
                ...product
              }
            }
          }
        }
      }
    }
    totalQuantity
    buyerIdentity {
      customer {
        email
      }
    }
  }
  ${productFragment}
`;

export default cartFragment;
