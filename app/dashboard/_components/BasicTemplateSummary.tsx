import { BASIC_TEMPLATE_MODULE_ORDER } from "@/app/[username]/_lib/basic-template";

const moduleLabels: Record<
  (typeof BASIC_TEMPLATE_MODULE_ORDER)[number],
  string
> = {
  header: "Header",
  profile: "Profile and social links",
  treatments: "Treatments",
  services: "Services",
  links: "Links",
  blogs: "Blog",
  videos: "Videos",
  gallery: "Gallery",
  reviews: "Reviews",
  locations: "Locations",
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
            Current profile appearance
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="current-template-heading"
              className="text-xl font-semibold text-dark"
            >
              Basic
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
          className="w-full max-w-48 rounded-xl border border-grey-300 bg-grey-50 p-3"
          role="img"
        >
          <div className="mx-auto mb-2 size-10 rounded-full bg-grey-300" />
          <div className="mx-auto mb-1 h-2 w-20 rounded bg-grey-400" />
          <div className="mx-auto mb-3 h-1.5 w-28 rounded bg-grey-300" />
          <div className="space-y-1.5">
            <div className="h-5 rounded-md bg-primary/20" />
            <div className="h-5 rounded-md bg-grey-200" />
            <div className="h-5 rounded-md bg-grey-200" />
          </div>
        </div>
      </div>

      <details className="mt-4 border-t border-grey-200 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          View Basic section order
        </summary>
        <ol className="mt-3 grid list-inside list-decimal gap-1 text-sm text-grey-700 sm:grid-cols-2">
          {BASIC_TEMPLATE_MODULE_ORDER.map((module) => (
            <li key={module}>{moduleLabels[module]}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
