type ReadOnlyRatingProps = {
  value?: number;
};

const STAR_COUNT = 5;

export function normalizeReadOnlyRating(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(STAR_COUNT, Math.max(0, Math.round(value)));
}

export default function ReadOnlyRating({ value }: ReadOnlyRatingProps) {
  const rating = normalizeReadOnlyRating(value);

  return (
    <div
      aria-label={`${rating} out of ${STAR_COUNT} stars`}
      className="flex justify-around overflow-hidden relative"
      role="img"
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="block text-[20px] leading-none"
          style={{
            color:
              index < rating ? "var(--color-accent-gold, #FFD700)" : "gray",
            cursor: "default",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
