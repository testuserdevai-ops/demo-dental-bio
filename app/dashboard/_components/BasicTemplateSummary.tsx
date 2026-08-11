import { PROFILE_TEMPLATE_CATALOG } from "@/lib/profile-presentation/catalog";

const basicTemplate = PROFILE_TEMPLATE_CATALOG.basic;

const moduleLabels: Record<(typeof basicTemplate.moduleOrder)[number], string> =
  {
    header: "Header",
    profile: "Profile and social links",
    treatments: "Treatments",
    services: "Services",
    links: "Links",
    blogs: "Blog",
    videos: "Videos",
    gallery: "Gallery",
    reviews: "Reviews",
    "locations-contact": "Locations",
    footer: "Contact and footer",
  };

export default function BasicTemplateSummary() {
  return (
    <section
      aria-labelledby="current-template-heading"
      className="rounded-2xl border border-grey-300 bg-white p-5 shadow-sm"
      data-testid="basic-template-summary"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <p className="mb-1 text-sm font-semibold text-primary">
            Available profile template
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="current-template-heading"
              className="text-xl font-semibold text-dark"
            >
              {basicTemplate.displayName}
            </h2>
            <span className="rounded-full bg-grey-100 px-2.5 py-1 text-xs font-semibold text-dark">
              Compatibility default
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-grey-700">
            Basic preserves the familiar DentalBio layout. Profiles without a
            saved template use it automatically, without changing their content
            or public actions.
          </p>
        </div>

        <div
          aria-label="Representative Basic template preview"
          className="w-full max-w-48 rounded-xl border border-[#8da6d8] bg-[#e8f0ff] p-3 shadow-inner"
          data-testid="basic-preview-canvas"
          role="img"
        >
          <div className="mx-auto mb-2 size-10 rounded-full border-2 border-white bg-[#3158b5] shadow-sm" />
          <div className="mx-auto mb-1 h-2 w-20 rounded bg-[#27324a]" />
          <div className="mx-auto mb-3 h-1.5 w-28 rounded bg-[#7082a8]" />
          <div className="space-y-2">
            <div
              className="h-6 rounded-md bg-[#3158b5] shadow-sm"
              data-testid="basic-preview-action"
            />
            <div
              className="rounded-md border border-[#b5c3df] bg-white p-1.5 shadow-sm"
              data-testid="basic-preview-content"
            >
              <div className="mb-1 h-1.5 w-2/3 rounded bg-[#455678]" />
              <div className="h-1.5 rounded bg-[#c3cee4]" />
            </div>
            <div className="rounded-md border border-[#b5c3df] bg-white p-1.5 shadow-sm">
              <div className="mb-1 h-1.5 w-1/2 rounded bg-[#455678]" />
              <div className="h-1.5 rounded bg-[#c3cee4]" />
            </div>
          </div>
        </div>
      </div>

      <details className="mt-4 border-t border-grey-200 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          View Basic section order
        </summary>
        <ol className="mt-3 grid list-inside list-decimal gap-1 text-sm text-grey-700 sm:grid-cols-2">
          {basicTemplate.moduleOrder.map((module) => (
            <li key={module}>{moduleLabels[module]}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
