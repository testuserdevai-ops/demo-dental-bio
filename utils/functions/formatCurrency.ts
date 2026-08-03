export const formatCurrency = (currency: string) => {
  return currency.split("(")[1].split(")")[0];
};
