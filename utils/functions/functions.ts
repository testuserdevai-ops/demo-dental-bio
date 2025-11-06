export const fillTemplate = (template: string, vars: Record<string, string | number>): string => {
  return template.replace(/{{(.*?)}}/g, (_, key) => String(vars[key.trim()] ?? ""));
}