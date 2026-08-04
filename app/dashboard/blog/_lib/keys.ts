export const blogKeys = {
  aggregate: (scopeId: string) => ["dashboard", "blogs", scopeId] as const,
};
