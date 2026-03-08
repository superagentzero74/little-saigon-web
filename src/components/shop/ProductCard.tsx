import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  handle: string;
  title: string;
  price: string;
  imageUrl: string;
  imageAlt: string;
}

export function ProductCard({
  handle,
  title,
  price,
  imageUrl,
  imageAlt,
}: ProductCardProps) {
  return (
    <Link href={`/shop/${handle}`}>
      <div className="ls-card p-0 overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer">
        {/* Image */}
        <div className="relative w-full aspect-square bg-ls-surface">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover"
            priority={false}
          />
        </div>

        {/* Content */}
        <div className="p-md">
          <h3 className="text-card-title text-ls-primary line-clamp-2">
            {title}
          </h3>
          <p className="text-body text-ls-secondary mt-xs">${price}</p>
        </div>
      </div>
    </Link>
  );
}
