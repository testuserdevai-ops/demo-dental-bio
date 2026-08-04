export const treatmentKeys = {
  aggregate: (scopeId: string) => ["dashboard", "treatments", scopeId] as const,
};
