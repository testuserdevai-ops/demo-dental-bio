import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  orderCommerceSections,
  selectCommerceClinicAction,
  selectCommerceProducts,
  type CommerceAction,
  type CommerceProduct,
} from "../_lib/clinic-commerce-template";
import ReadOnlyRating from "../components/ReadOnlyRating";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";

function ClinicAction({ action }: { action: CommerceAction }) {
  return (
    <TrackedLink
      analytics={action.analytics}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:w-auto"
      href={action.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {action.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </TrackedLink>
  );
}

function ProductPrice({ product }: { product: CommerceProduct }) {
  if (!product.price) return null;
  const amount = Number(product.price);
  let value = product.price;
  if (Number.isFinite(amount) && product.currency) {
    try {
      value = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: product.currency,
      }).format(amount);
    } catch {
      value = `${product.currency} ${product.price}`;
    }
  }
  return <p className="mt-1 text-sm font-bold text-card-foreground">{value}</p>;
}

function ProductCard({
  featured = false,
  product,
}: {
  featured?: boolean;
  product: CommerceProduct;
}) {
  return (
    <article
      className={`overflow-hidden rounded-[var(--radius-lg)] border bg-card shadow-sm ${featured ? "border-[var(--profile-primary-action)]" : "border-border"}`}
      data-product-id={product.id}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <SafeImage
          alt={product.name?.trim() || "Oral care product"}
          className="object-cover"
          fill
          sizes={
            featured
              ? "(min-width: 640px) 520px, calc(100vw - 34px)"
              : "(min-width: 640px) 280px, calc(100vw - 34px)"
          }
          src={product.image_url}
        />
        {featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/95 px-3 py-1 text-xs font-bold text-foreground shadow-sm">
            Featured pick
          </span>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">
        {product.platform?.trim() ? (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {product.platform}
          </p>
        ) : null}
        <h3 className="mt-1 text-lg font-bold leading-snug text-card-foreground">
          {product.label}
        </h3>
        <ProductPrice product={product} />
        <TrackedLink
          analytics={{
            section: "shop",
            position: product.position,
            action: { type: "product_click", productId: product.id },
          }}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-secondary-action)] px-5 py-3 text-center text-sm font-bold text-[var(--profile-on-secondary-action)] no-underline hover:bg-[var(--profile-secondary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          href={product.href}
          rel="sponsored noopener noreferrer"
          target="_blank"
        >
          View product
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedLink>
      </div>
    </article>
  );
}

function ClinicSection({
  action,
  profile,
}: {
  action: CommerceAction | null;
  profile: PublicProfileViewModel;
}) {
  const treatments = profile.treatments
    .filter(({ treatments: treatment }) => Boolean(treatment))
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);

  return (
    <section
      aria-labelledby="commerce-clinic-heading"
      className="space-y-4"
      id="clinic"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Clinical care
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id="commerce-clinic-heading"
        >
          Visit the clinic
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Evidence-led advice and individual care remain at the centre of every
          recommendation.
        </p>
      </div>
      {treatments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {treatments.map((entry) => (
            <article
              className="rounded-[var(--radius-md)] border border-border bg-card p-4"
              key={entry.treatment_id}
            >
              <h3 className="font-bold text-card-foreground">
                {entry.treatments?.title?.trim() || "Personalised dental care"}
              </h3>
              {entry.treatments?.description?.trim() ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {entry.treatments.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      {action ? <ClinicAction action={action} /> : null}
    </section>
  );
}

function ShopSection({
  products,
}: {
  products: ReturnType<typeof selectCommerceProducts>;
}) {
  if (!products.featured) return null;
  return (
    <section
      aria-labelledby="commerce-shop-heading"
      className="space-y-4"
      id="shop"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Dentist-curated shop
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id="commerce-shop-heading"
        >
          Everyday care, selected with purpose
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Browse practical products and resources chosen to support healthy
          routines between appointments.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.products.map((product, index) => (
          <ProductCard
            featured={index === 0}
            key={product.id}
            product={product}
          />
        ))}
      </div>
      <p
        className="rounded-[var(--radius-md)] border border-border bg-muted/60 p-4 text-xs leading-5 text-muted-foreground"
        id="commerce-disclosure"
      >
        Product links may be affiliate links. Recommendations are general and do
        not replace advice tailored to your oral health.
      </p>
    </section>
  );
}

function TrustSection({ profile }: { profile: PublicProfileViewModel }) {
  const reviews = profile.reviews.slice(0, 2);
  const newsletter = profile.linkGroups
    .flatMap((group) => group.dentistry_links.map(({ links }) => links))
    .find(
      (link) =>
        link.is_active &&
        /newsletter|updates|community/i.test(link.title ?? ""),
    );
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {reviews.length > 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Patient confidence
          </p>
          {reviews.map((review) => (
            <blockquote
              className="mt-4 border-l-2 border-[var(--profile-primary-action)] pl-4 text-sm leading-6 text-card-foreground"
              key={review.id}
            >
              <ReadOnlyRating value={review.stars ?? undefined} />
              {review.content?.trim() ? (
                <p className="mt-2">“{review.content}”</p>
              ) : null}
            </blockquote>
          ))}
        </div>
      ) : null}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Stay connected
        </p>
        <h2 className="mt-1 text-xl font-bold text-card-foreground">
          Care notes and clinic updates
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Get practical guidance for your routine and news from the clinic.
        </p>
        {newsletter?.link && newsletter.title ? (
          <TrackedLink
            analytics={{
              section: "links",
              action: { type: "link_click", linkId: newsletter.link_id },
            }}
            className="mt-4 inline-flex min-h-11 items-center font-bold text-[var(--profile-link)] underline-offset-4 hover:underline"
            href={newsletter.link}
            rel="noopener noreferrer"
            target="_blank"
          >
            {newsletter.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>
        ) : null}
        <div className="mt-4">
          <DirectBookingSocialLinks
            socials={profile.socials}
            website={profile.dentistry.website}
          />
        </div>
      </div>
    </section>
  );
}

export default function ClinicCommerceProfileTemplate({
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["clinic-commerce"];
  const products = selectCommerceProducts(answers, profile.products);
  const clinicAction = selectCommerceClinicAction(profile.dentistry);
  const displayName = [
    profile.user.title,
    profile.user.first_name,
    profile.user.last_name,
  ]
    .filter((part) => part?.trim())
    .join(" ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[960px] overflow-x-clip bg-background px-4 pb-16 pt-4 text-foreground sm:px-8 sm:py-10 lg:px-10"
      data-profile-template="clinic-commerce"
    >
      <div className="space-y-10 sm:space-y-14">
        <section
          aria-labelledby="commerce-name"
          className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--elevation-card)]"
        >
          <div className="grid sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-stretch">
            <div className="relative h-44 overflow-hidden bg-muted sm:h-auto sm:min-h-80">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Profile portrait"
                }
                className="object-cover"
                fill
                priority
                sizes="(min-width: 640px) 208px, calc(100vw - 34px)"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Clinic expertise · curated care
              </p>
              <h1
                className="mt-2 text-balance text-3xl font-bold tracking-tight text-card-foreground"
                id="commerce-name"
              >
                {profile.dentistry.about_title?.trim() ||
                  displayName ||
                  "Professional care, in clinic and at home"}
              </h1>
              {displayName ? (
                <p className="mt-3 text-sm font-bold text-card-foreground">
                  {displayName}
                </p>
              ) : null}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {profile.dentistry.about_text?.trim()}
              </p>
              <nav
                aria-label="Choose clinic or shop"
                className="mt-5 grid grid-cols-2 gap-3"
              >
                {clinicAction ? (
                  <ClinicAction action={clinicAction} />
                ) : (
                  <a
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-4 font-bold text-foreground"
                    href="#clinic"
                  >
                    Explore clinic
                  </a>
                )}
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-4 text-center font-bold text-[var(--profile-on-secondary-action)] no-underline"
                  href="#shop"
                >
                  Browse the shop
                </a>
              </nav>
            </div>
          </div>
        </section>

        {orderCommerceSections(answers.defaultAudience).map((section) =>
          section === "shop" ? (
            <ShopSection key={section} products={products} />
          ) : (
            <ClinicSection
              action={clinicAction}
              key={section}
              profile={profile}
            />
          ),
        )}
        <TrustSection profile={profile} />
      </div>
    </main>
  );
}
