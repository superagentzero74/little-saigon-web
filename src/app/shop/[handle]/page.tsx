'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getProductByHandle, createCart, addToCart } from '@/lib/shopify';
import { useShoppingCart } from '@/contexts/ShoppingContext';

interface ProductVariant {
  id: string;
  title: string;
  selectedOptions: Array<{ name: string; value: string }>;
  price: { amount: string; currencyCode: string };
  sku: string;
  availableForSale: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

interface ProductData {
  product: {
    id: string;
    handle: string;
    title: string;
    description: string;
    descriptionHtml: string;
    priceRange: {
      minVariantPrice: { amount: string; currencyCode: string };
      maxVariantPrice: { amount: string; currencyCode: string };
    };
    images: {
      edges: Array<{ node: ProductImage }>;
    };
    variants: {
      edges: Array<{ node: ProductVariant }>;
    };
    tags: string[];
  };
}

export default function ProductPage({ params }: { params: { handle: string } }) {
  const router = useRouter();
  const { cart, setCart } = useShoppingCart();
  const [product, setProduct] = useState<ProductData['product'] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = (await getProductByHandle(params.handle)) as ProductData;
        const productData = data?.product;
        setProduct(productData);
        if (productData?.variants?.edges?.length > 0) {
          setSelectedVariant(productData.variants.edges[0].node);
        }
      } catch (e) {
        console.error('Failed to fetch product:', e);
        setError('Failed to load product. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params.handle]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAddingToCart(true);
    try {
      const newLine = {
        merchandiseId: selectedVariant.id,
        quantity,
      };

      let newCart;
      if (cart) {
        // Add to existing cart
        const result = await addToCart(cart.id, [newLine]);
        newCart = (result as any)?.cartLinesAdd?.cart;
      } else {
        // Create new cart
        const result = await createCart([newLine]);
        newCart = (result as any)?.cartCreate?.cart;
      }

      if (newCart) {
        setCart(newCart);
        // Redirect to checkout
        window.location.href = newCart.checkoutUrl;
      }
    } catch (e) {
      console.error('Failed to add to cart:', e);
      setError('Error adding to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="ls-container ls-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2xl animate-pulse">
          <div className="aspect-square bg-ls-surface rounded-card" />
          <div className="space-y-lg">
            <div className="h-8 bg-ls-surface rounded w-3/4" />
            <div className="h-6 bg-ls-surface rounded w-1/4" />
            <div className="space-y-2">
              <div className="h-4 bg-ls-surface rounded" />
              <div className="h-4 bg-ls-surface rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="ls-container ls-section">
        <p className="text-body text-ls-secondary">Product not found</p>
      </div>
    );
  }

  const hasMultipleVariants = product.variants?.edges?.length > 1;
  const images = product.images?.edges || [];

  return (
    <div className="ls-container ls-section">
      {error && (
        <div className="ls-card p-lg mb-2xl bg-red-50 border-red-200">
          <p className="text-body text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2xl">
        {/* Images */}
        <div className="space-y-md">
          {images.map((img, idx) => (
            <div key={img.node.id} className="relative w-full aspect-square">
              <Image
                src={img.node.url}
                alt={img.node.altText || product.title}
                fill
                className="object-cover rounded-card"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-page-title text-ls-primary mb-md">
            {product.title}
          </h1>

          <p className="text-section-header text-ls-secondary mb-xl">
            $
            {selectedVariant?.price?.amount ||
              product.priceRange.minVariantPrice.amount}
          </p>

          {product.description && (
            <p className="text-body text-ls-body mb-xl">{product.description}</p>
          )}

          {/* Variant Selector */}
          {hasMultipleVariants && (
            <div className="mb-xl">
              <label className="text-card-title text-ls-primary block mb-md">
                Options
              </label>
              <select
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  const variant = product.variants.edges.find(
                    (v) => v.node.id === e.target.value
                  )?.node;
                  if (variant) setSelectedVariant(variant);
                }}
                className="w-full ls-card"
              >
                {product.variants.edges.map((v) => (
                  <option key={v.node.id} value={v.node.id}>
                    {v.node.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-xl flex gap-md items-center">
            <label className="text-card-title text-ls-primary">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="ls-card w-20"
            />
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || !selectedVariant?.availableForSale}
            className="ls-btn w-full py-lg text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>

          {selectedVariant && !selectedVariant.availableForSale && (
            <p className="text-meta text-ls-secondary mt-md">Out of stock</p>
          )}
        </div>
      </div>
    </div>
  );
}
