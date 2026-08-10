const previewSectionIdsByDashboardPath: Record<string, string> = {
  "/dashboard/blog": "blog",
  "/dashboard/gallery": "gallery",
  "/dashboard/links": "links",
  "/dashboard/location": "location",
  "/dashboard/review": "review",
  "/dashboard/video": "video",
};

export function getPreviewSectionId(pathname: string): string | null {
  return previewSectionIdsByDashboardPath[pathname] ?? null;
}

export function scrollPreviewToSection(
  previewDocument: Document | null,
  sectionId: string | null,
  prefersReducedMotion: boolean,
) {
  if (!previewDocument || !sectionId) return;

  previewDocument.getElementById(sectionId)?.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}
