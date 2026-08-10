export const productKeys = {
  aggregate: (scopeId: string) => ["dashboard", "products", scopeId] as const,
};
