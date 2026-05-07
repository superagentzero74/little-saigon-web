import Link from 'next/link';
import OptImage from '@/components/ui/OptImage';

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
  hideDetails = false,
}: ProductCardProps & { hideDetails?: boolean }) {
  return (
    <Link href={`/shop/${handle}`}>
      <div className="overflow-hidden hover:opacity-80 transition-opacity cursor-pointer">
        {/* Image */}
        <div className="relative w-full aspect-square bg-ls-surface rounded-card overflow-hidden">
          <OptImage
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(min-width: 640px) 25vw, 33vw"
            className="object-cover"
            priority={false}
          />
        </div>

        {/* Content — hidden in grid view */}
        {!hideDetails && (
          <div className="pt-sm">
            <h3 className="text-[12px] font-medium text-ls-primary line-clamp-2">
              {title}
            </h3>
            <p className="text-[13px] font-semibold text-ls-primary mt-[2px]">
              ${Math.round(parseFloat(price))}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
