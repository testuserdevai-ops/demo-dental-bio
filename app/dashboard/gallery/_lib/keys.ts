export const galleryKeys = {
  all: ["dashboard", "galleries"] as const,
  aggregate: (scopeId: string) =>
    [...galleryKeys.all, "aggregate", scopeId] as const,
};
