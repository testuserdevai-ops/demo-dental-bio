const previewSectionIdsByDashboardPath: Record<string, string> = {
  "/dashboard/blog": "blog",
  "/dashboard/gallery": "gallery",
  "/dashboard/links": "links",
  "/dashboard/location": "location",
  "/dashboard/review": "review",
  "/dashboard/treatments": "treatments",
  "/dashboard/video": "video",
};

export function getPreviewSectionId(pathname: string): string | null {
  return previewSectionIdsByDashboardPath[pathname] ?? null;
}

export function scrollPreviewToSection(
  previewFrame: HTMLIFrameElement | null,
  sectionId: string | null,
  prefersReducedMotion: boolean,
) {
  if (!previewFrame || !sectionId) return;

  const previewWindow = previewFrame.contentWindow;
  if (!previewWindow) return;

  previewWindow.postMessage(
    {
      type: "dentalbio:preview-scroll",
      sectionId,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    },
    window.location.origin,
  );
}
