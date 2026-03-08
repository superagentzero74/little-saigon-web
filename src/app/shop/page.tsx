'use client';

import { useState, useEffect } from 'react';
import { getProducts, getCollections } from '@/lib/shopify';
import { ProductCard } from '@/components/shop/ProductCard';

interface ProductEdge {
  node: {
    id: string;
    handle: string;
    title: string;
    description: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    tags: string[];
  };
}

interface CollectionEdge {
  node: {
    id: string;
    handle: string;
    title: string;
    description: string;
    image: {
      url: string;
      altText: string | null;
    };
  };
}

interface ProductsData {
  products: {
    edges: ProductEdge[];
  };
}

interface CollectionsData {
  collections: {
    edges: CollectionEdge[];
  };
}

export default function ShopPage() {
  const [products, setProducts] = useState<ProductEdge[]>([]);
  const [collections, setCollections] = useState<CollectionEdge[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [productsData, collectionsData] = await Promise.all([
          getProducts(20),
          getCollections(10),
        ]) as [ProductsData, CollectionsData];

        setProducts(productsData?.products?.edges || []);
        setCollections(collectionsData?.collections?.edges || []);
      } catch (e) {
        console.error('Failed to fetch shop data:', e);
        setError('Failed to load products. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="ls-container ls-section">
      <h1 className="text-page-title text-ls-primary mb-2xl">Shop</h1>

      {error && (
        <div className="ls-card p-lg mb-2xl bg-red-50 border-red-200">
          <p className="text-body text-red-700">{error}</p>
        </div>
      )}

      {/* Collection Filter */}
      {collections.length > 0 && (
        <div className="flex gap-md overflow-x-auto pb-xl mb-2xl">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`ls-pill ${!selectedCollection ? 'ls-pill-active' : ''} whitespace-nowrap`}
          >
            All
          </button>
          {collections.map((col) => (
            <button
              key={col.node.handle}
              onClick={() => setSelectedCollection(col.node.handle)}
              className={`ls-pill ${
                selectedCollection === col.node.handle ? 'ls-pill-active' : ''
              } whitespace-nowrap`}
            >
              {col.node.title}
            </button>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-xl">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="ls-card p-0 animate-pulse">
                <div className="w-full aspect-square bg-ls-surface" />
                <div className="p-md space-y-xs">
                  <div className="h-4 bg-ls-surface rounded" />
                  <div className="h-3 bg-ls-surface rounded w-1/2" />
                </div>
              </div>
            ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-body text-ls-secondary text-center py-3xl">
          No products found
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-xl">
          {products.map((product) => (
            <ProductCard
              key={product.node.id}
              handle={product.node.handle}
              title={product.node.title}
              price={product.node.priceRange.minVariantPrice.amount}
              imageUrl={
                product.node.images?.edges?.[0]?.node?.url || '/placeholder.jpg'
              }
              imageAlt={
                product.node.images?.edges?.[0]?.node?.altText || product.node.title
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
