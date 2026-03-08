const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN!;
const SHOPIFY_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const data: GraphQLResponse<T> = await response.json();

  if (data.errors) {
    throw new Error(`Shopify error: ${data.errors[0].message}`);
  }

  return data.data as T;
}

// Product Queries
export async function getProducts(first: number = 20, query?: string) {
  const gql = `
    query GetProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            handle
            title
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            tags
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { first, query });
  return result;
}

export async function getProductByHandle(handle: string) {
  const gql = `
    query GetProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        description
        descriptionHtml
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        variants(first: 20) {
          edges {
            node {
              id
              title
              selectedOptions {
                name
                value
              }
              price {
                amount
                currencyCode
              }
              sku
              availableForSale
            }
          }
        }
        tags
      }
    }
  `;

  const result = await shopifyFetch(gql, { handle });
  return result;
}

export async function getCollections(first: number = 10) {
  const gql = `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            handle
            title
            description
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { first });
  return result;
}

export async function getCollectionProducts(
  handle: string,
  first: number = 20
) {
  const gql = `
    query GetCollectionProducts($handle: String!, $first: Int!) {
      collection(handle: $handle) {
        id
        handle
        title
        description
        image {
          url
          altText
        }
        products(first: $first) {
          edges {
            node {
              id
              handle
              title
              description
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { handle, first });
  return result;
}

// Cart Operations
interface CreateCartLine {
  merchandiseId: string;
  quantity: number;
}

export async function createCart(lines: CreateCartLine[]) {
  const gql = `
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      title
                      handle
                    }
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { input: { lines } });
  return result;
}

export async function addToCart(
  cartId: string,
  lines: CreateCartLine[]
) {
  const gql = `
    mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      title
                      handle
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { cartId, lines });
  return result;
}

export async function updateCartLine(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>
) {
  const gql = `
    mutation UpdateCartLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { cartId, lines });
  return result;
}

export async function removeFromCart(cartId: string, lineIds: string[]) {
  const gql = `
    mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyFetch(gql, { cartId, lineIds });
  return result;
}
