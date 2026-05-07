'use client';

import { useState, useEffect } from 'react';
import { getProducts, getCollectionProducts } from '@/lib/shopify';
import { ProductCard } from '@/components/shop/ProductCard';
import { Search, ExternalLink } from 'lucide-react';

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  tags: string[];
}

const MENU_ITEMS = [
  { label: "Shop All", handle: "shop" },
  { label: "New", handle: "featured" },
  { label: "T-Shirts", handle: "shirts" },
  { label: "Hats", handle: "hats" },
  { label: "Hoodies & Crews", handle: "hoodies" },
  { label: "Jackets & Jerseys", handle: "coats-jerseys" },
  { label: "Accessories", handle: "accessories" },
  { label: "Bags", handle: "bags" },
];

export default function ShopPage() {
  const [products, setProducts] = useState<ProductNode[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("shop");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async (handle: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (handle === "shop") {
        const data: any = await getProducts(40);
        setProducts(data?.products?.edges?.map((e: any) => e.node) || []);
      } else {
        const data: any = await getCollectionProducts(handle, 40);
        setProducts(data?.collection?.products?.edges?.map((e: any) => e.node) || []);
      }
    } catch (e) {
      setError("Failed to load products");
    }
    setIsLoading(false);
  };

  useEffect(() => { loadProducts(selectedCollection); }, [selectedCollection]);

  const filtered = searchQuery
    ? products.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const [merchImages] = useState(() =>
    ["/images/merch-1.jpg", "/images/merch-2.jpg", "/images/merch-3.jpg", "/images/merch-4.jpg",
     "/images/merch-5.jpg", "/images/merch-6.jpg", "/images/merch-7.jpg", "/images/merch-8.jpg",
    ].sort(() => Math.random() - 0.5)
  );

  return (
    <div className="ls-container py-xl">
      <div className="flex gap-2xl">
        {/* Sidebar */}
        <aside className="hidden md:block w-[200px] shrink-0">
          <div className="sticky top-[160px]">
            <h2 className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-md">Categories</h2>
            <nav className="space-y-[2px]">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.handle}
                  onClick={() => { setSelectedCollection(item.handle); setSearchQuery(""); }}
                  className={`w-full text-left px-md py-[8px] rounded-btn text-[13px] font-medium transition-colors ${
                    selectedCollection === item.handle
                      ? "bg-ls-primary text-white"
                      : "text-ls-primary hover:bg-ls-surface"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="border-t border-ls-border mt-lg pt-lg">
              <a
                href="https://littlesaigonca.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-sm text-[12px] text-ls-secondary hover:text-ls-primary transition-colors"
              >
                <ExternalLink size={13} />
                Shop Full Site
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Image Slider */}
          <div className="mb-xl overflow-x-auto scrollbar-hide -mx-sm px-sm" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-[2px]" style={{ scrollSnapType: "x mandatory" }}>
              {merchImages.map((src, i) => (
                <div key={i} className="shrink-0" style={{ scrollSnapAlign: "start" }}>
                  <img
                    src={src}
                    alt={`Little Saigon merch ${i + 1}`}
                    className="h-[380px] w-auto object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-lg mb-xl">
            <div>
              <h1 className="text-[22px] font-bold text-ls-primary">
                {MENU_ITEMS.find((m) => m.handle === selectedCollection)?.label || "Shop"}
              </h1>
              <p className="text-[13px] text-ls-secondary mt-[2px]">
                {isLoading ? "Loading..." : `${filtered.length} products`}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-[260px]">
              <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-[36px] pr-md py-[8px] bg-ls-surface rounded-full text-[13px] outline-none focus:ring-2 focus:ring-ls-primary/20"
              />
            </div>
          </div>

          {/* Mobile collection pills */}
          <div className="md:hidden flex gap-sm overflow-x-auto pb-lg mb-lg">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.handle}
                onClick={() => { setSelectedCollection(item.handle); setSearchQuery(""); }}
                className={`whitespace-nowrap px-md py-[6px] rounded-full text-[12px] font-medium transition-colors ${
                  selectedCollection === item.handle
                    ? "bg-ls-primary text-white"
                    : "bg-ls-surface text-ls-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="ls-card bg-red-50 border-red-200 mb-xl">
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-sm">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-ls-surface rounded-card" />
                  <div className="mt-sm space-y-xs">
                    <div className="h-3.5 bg-ls-surface rounded w-3/4" />
                    <div className="h-3 bg-ls-surface rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-[64px]">
              <p className="text-[15px] font-semibold text-ls-primary">No products found</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="ls-btn-secondary mt-md text-[13px]">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-sm">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  handle={product.handle}
                  title={product.title}
                  price={product.priceRange.minVariantPrice.amount}
                  imageUrl={product.images?.edges?.[0]?.node?.url || ''}
                  imageAlt={product.images?.edges?.[0]?.node?.altText || product.title}
                  hideDetails
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
