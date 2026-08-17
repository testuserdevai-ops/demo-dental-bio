import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import {
  orderCommerceSections,
  selectCommerceClinicAction,
  selectCommerceBlogGroups,
  selectCommerceGallery,
  selectCommerceProducts,
  type CommerceAction,
  type CommerceProduct,
} from "../_lib/clinic-commerce-template";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ClinicCommerceBlogSection from "./ClinicCommerceBlogSection";
import ClinicCommerceGallerySection from "./ClinicCommerceGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";

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
          rel="noopener noreferrer"
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
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const hasInventory =
    inventory.treatments.length > 0 || inventory.services.length > 0;

  if (!hasInventory && !action) return null;

  return (
    <div className="space-y-5" id="clinic">
      <ProfileTreatmentServiceSections
        inventory={inventory}
        moduleId="clinic-commerce"
        serviceTitle={profile.dentistry.service_section_title}
        treatmentTitle={profile.dentistry.treatment_section_title}
        variant="card-grid"
      />
      {action ? <ClinicAction action={action} /> : null}
    </div>
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
          Shop
        </h2>
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
        Product links open an external seller&apos;s website. Review the seller,
        price, delivery, and return information before continuing. An outbound
        click is not treated as a purchase by DentalBio.
      </p>
    </section>
  );
}

function CommunitySection({ profile }: { profile: PublicProfileViewModel }) {
  const hasSocials = Boolean(
    profile.dentistry.website?.trim() ||
    (profile.socials && Object.values(profile.socials).some(Boolean)),
  );

  if (!hasSocials) return null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Links and social profiles
      </p>
      {hasSocials ? (
        <div className="mt-4 [&_a]:!inline-flex [&_a]:!size-11 [&_a]:items-center [&_a]:justify-center [&_a]:!p-0">
          <DirectBookingSocialLinks
            socials={profile.socials}
            website={profile.dentistry.website}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function ClinicCommerceProfileTemplate({
  profile,
  username,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["clinic-commerce"];
  const products = selectCommerceProducts(answers, profile.products);
  const blogGroups = selectCommerceBlogGroups(profile.blogGroups);
  const gallery = selectCommerceGallery(
    profile.galleries,
    profile.generalGalleries,
  );
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
      className="mx-auto min-h-screen w-full max-w-[661px] overflow-x-clip bg-background px-4 pb-12 pt-3 text-foreground sm:px-8 sm:py-10"
      data-profile-template="clinic-commerce"
    >
      <div className="space-y-8 sm:space-y-10">
        <section
          aria-labelledby="commerce-name"
          className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--elevation-card)]"
          id="profile"
        >
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5 sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-muted">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Profile portrait"
                }
                className="object-cover object-top"
                fill
                priority
                sizes="(min-width: 640px) 144px, 96px"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {profile.user.position?.trim() || "Dental professional"}
              </p>
              <h1
                className="mt-1 text-balance text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl"
                id="commerce-name"
              >
                {displayName || "Dental professional"}
              </h1>
              {profile.user.qualification?.trim() ? (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {profile.user.qualification}
                </p>
              ) : null}
            </div>
          </div>
          <div className="border-t border-border p-4 sm:p-6">
            {profile.dentistry.about_title?.trim() ? (
              <h2 className="text-balance text-xl font-bold text-card-foreground sm:text-2xl">
                {profile.dentistry.about_title}
              </h2>
            ) : null}
            {profile.dentistry.about_text?.trim() ? (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {profile.dentistry.about_text}
              </p>
            ) : null}
            <nav
              aria-label="Choose clinic or shop"
              className="mt-4 grid grid-cols-2 gap-2"
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
              {products.featured ? (
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-4 text-center font-bold text-[var(--profile-on-secondary-action)] no-underline"
                  href="#shop"
                >
                  Browse the shop
                </a>
              ) : null}
            </nav>
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
        <ClinicCommerceGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
        />
        <ClinicCommerceBlogSection groups={blogGroups} username={username} />
        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          reviews={profile.reviews}
          templateId="clinic-commerce"
        />
        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="clinic-commerce"
          variant="grid"
        />
        <CommunitySection profile={profile} />
      </div>
    </main>
  );
}
