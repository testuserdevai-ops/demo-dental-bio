export const convertToSlug = (basic: string) => {
  const baseSlug = basic
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
  return baseSlug;
};
