import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { Card, CardContent } from "@/app/components/ui/card";

import type { ProfileProduct } from "../_lib/profile-products";

function ProductPrice({ product }: { product: ProfileProduct }) {
  if (!product.price) return null;

  return (
    <p className="text-sm font-bold text-card-foreground">
      {product.currency ? `${product.currency} ` : ""}
      {product.price}
    </p>
  );
}

function ProductCard({ product }: { product: ProfileProduct }) {
  return (
    <Card
      className="overflow-hidden"
      data-product-id={product.id}
      data-product-position={product.position}
    >
      {product.image_url ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <SafeImage
            alt={product.name}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, calc(100vw - 48px)"
            src={product.image_url}
          />
        </div>
      ) : null}
      <CardContent className="space-y-3 p-4 sm:p-5">
        {product.platform ? (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {product.platform}
          </p>
        ) : null}
        <h3 className="text-lg font-bold leading-snug text-card-foreground">
          {product.name}
        </h3>
        <ProductPrice product={product} />
        <TrackedLink
          analytics={{
            section: "shop",
            position: product.position,
            action: { type: "product_click", productId: Number(product.id) },
          }}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-secondary-action)] px-5 py-3 text-center text-sm font-bold text-[var(--profile-on-secondary-action)] no-underline hover:bg-[var(--profile-secondary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          href={product.link}
          rel="noopener noreferrer"
          target="_blank"
        >
          View product
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedLink>
      </CardContent>
    </Card>
  );
}

export default function ProfileProductSection({
  products,
}: {
  products: readonly ProfileProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section
      aria-label="Shop"
      className="space-y-4"
      data-profile-module="shop"
      id="shop"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <p className="rounded-[var(--radius-md)] border border-border bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
        Product links open an external seller&apos;s website. Review the seller,
        price, delivery, and return information before continuing. An outbound
        click is not treated as a purchase by DentalBio.
      </p>
    </section>
  );
}
