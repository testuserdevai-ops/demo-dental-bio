export const profileKeys = {
  detail: (scopeId: string) => ["dashboard", "profile", scopeId] as const,
};
