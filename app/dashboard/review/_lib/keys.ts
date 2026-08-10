export const reviewKeys = {
  all: ["dashboard", "reviews"] as const,
  aggregate: (scopeId: string) =>
    [...reviewKeys.all, "aggregate", scopeId] as const,
};
