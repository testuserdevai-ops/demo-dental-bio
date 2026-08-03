export const brandFaviconByDomain = {
  "coach.bio": "/favicons/coachbio.svg",
  "dental.bio": "/favicons/dentalbio.svg",
  "doctors.bio": "/favicons/doctorsbio.svg",
  "injector.bio": "/favicons/injectorbio.svg",
  "pharmacists.bio": "/favicons/pharmacistsbio.svg",
  "podcasts.bio": "/favicons/podcastsbio.svg",
  "specialist.bio": "/favicons/specialistbio.svg",
  "therapists.bio": "/favicons/therapistsbio.svg",
} as const;

export type SupportedBrandDomain = keyof typeof brandFaviconByDomain;

export function getBrandFavicon(domain: string): string {
  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return (
    brandFaviconByDomain[normalized as SupportedBrandDomain] ??
    brandFaviconByDomain["dental.bio"]
  );
}
