export const fillTemplate = (template: string, vars: Record<string, string | number>): string => {
  return template.replace(/{{(.*?)}}/g, (_, key) => String(vars[key.trim()] ?? ""));
}

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}