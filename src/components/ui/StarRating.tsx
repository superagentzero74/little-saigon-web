import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  totalRatings?: number;
}

export default function StarRating({
  rating,
  size = 14,
  showValue = true,
  totalRatings,
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-xs">
      <div className="flex gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={2}
            className={
              i <= fullStars
                ? "fill-ls-primary text-ls-primary"
                : i === fullStars + 1 && hasHalf
                ? "fill-ls-primary/50 text-ls-primary"
                : "fill-none text-[#D1D1D1]"
            }
          />
        ))}
      </div>
      {showValue && (
        <span className="text-meta text-ls-primary font-semibold">
          {rating.toFixed(1)}
        </span>
      )}
      {totalRatings !== undefined && (
        <span className="text-tag text-ls-secondary">({totalRatings})</span>
      )}
    </div>
  );
}
